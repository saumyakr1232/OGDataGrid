import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Table } from '@tanstack/react-table';
import type { Virtualizer } from '@tanstack/react-virtual';
import type { DataGridColumnMeta } from '../types';

export interface CellPos {
  rowIndex: number;
  colIndex: number;
}

export interface CellRange {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

export interface UseCellInteractionResult {
  active: CellPos | null;
  setActive: (p: CellPos | null) => void;
  anchor: CellPos | null;
  range: CellRange | null;
  isInRange: (rowIndex: number, colIndex: number) => boolean;
  isActive: (rowIndex: number, colIndex: number) => boolean;
  onCellMouseDown: (e: React.MouseEvent, rowIndex: number, colIndex: number) => void;
  onCellMouseEnter: (e: React.MouseEvent, rowIndex: number, colIndex: number) => void;
  onCellClick: (e: React.MouseEvent, rowIndex: number, colIndex: number) => void;
  onCellContextMenu: (e: React.MouseEvent, rowIndex: number, colIndex: number) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  copySelection: () => Promise<void>;
  clear: () => void;
}

function normRange(a: CellPos, f: CellPos): CellRange {
  return {
    startRow: Math.min(a.rowIndex, f.rowIndex),
    endRow: Math.max(a.rowIndex, f.rowIndex),
    startCol: Math.min(a.colIndex, f.colIndex),
    endCol: Math.max(a.colIndex, f.colIndex),
  };
}

export function useCellInteraction<T>({
  table,
  virtualizer,
  enabled = true,
  onCopy,
  scrollerRef,
  rootRef,
  pageSize,
}: {
  table: Table<T>;
  virtualizer?: Virtualizer<HTMLDivElement, Element> | null;
  enabled?: boolean;
  onCopy?: (text: string) => void;
  scrollerRef: React.RefObject<HTMLDivElement | null>;
  rootRef?: React.RefObject<HTMLElement | null>;
  pageSize: number;
}): UseCellInteractionResult {
  const [active, setActiveState] = useState<CellPos | null>(null);
  const [anchor, setAnchor] = useState<CellPos | null>(null);

  const rows = table.getRowModel().rows;
  const leafCols = table.getVisibleLeafColumns();

  const rowCount = rows.length;
  const colCount = leafCols.length;

  const clamp = useCallback(
    (p: CellPos): CellPos => ({
      rowIndex: Math.max(0, Math.min(rowCount - 1, p.rowIndex)),
      colIndex: Math.max(0, Math.min(colCount - 1, p.colIndex)),
    }),
    [rowCount, colCount],
  );

  const setActive = useCallback(
    (p: CellPos | null) => {
      if (!p) {
        setActiveState(null);
        setAnchor(null);
        return;
      }
      const c = clamp(p);
      setActiveState(c);
      setAnchor(c);
    },
    [clamp],
  );

  const scrollToActive = useCallback(
    (p: CellPos) => {
      if (virtualizer) {
        virtualizer.scrollToIndex(p.rowIndex, { align: 'auto' });
      } else if (scrollerRef.current) {
        const tr = scrollerRef.current.querySelector<HTMLTableRowElement>(
          `tr[data-row-index="${p.rowIndex}"]`,
        );
        tr?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
      // horizontal best-effort
      const cell = scrollerRef.current?.querySelector<HTMLElement>(
        `[data-row-index="${p.rowIndex}"] [data-col-index="${p.colIndex}"]`,
      );
      cell?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    },
    [virtualizer, scrollerRef],
  );

  const range = useMemo<CellRange | null>(() => {
    if (!active || !anchor) return null;
    return normRange(anchor, active);
  }, [active, anchor]);

  const isInRange = useCallback(
    (rowIndex: number, colIndex: number) => {
      if (!range) return false;
      return (
        rowIndex >= range.startRow &&
        rowIndex <= range.endRow &&
        colIndex >= range.startCol &&
        colIndex <= range.endCol
      );
    },
    [range],
  );

  const isActive = useCallback(
    (rowIndex: number, colIndex: number) =>
      !!active && active.rowIndex === rowIndex && active.colIndex === colIndex,
    [active],
  );

  const buildTsv = useCallback((): string => {
    if (!range) return '';
    const lines: string[] = [];
    for (let r = range.startRow; r <= range.endRow; r++) {
      const row = rows[r];
      if (!row) continue;
      const cells: string[] = [];
      for (let c = range.startCol; c <= range.endCol; c++) {
        const col = leafCols[c];
        if (!col) continue;
        const meta = col.columnDef.meta as DataGridColumnMeta<T> | undefined;
        const raw = meta?.exportValue
          ? meta.exportValue(row.original)
          : row.getValue(col.id);
        const s = raw == null ? '' : String(raw);
        cells.push(s.replace(/\t/g, ' ').replace(/\r?\n/g, ' '));
      }
      lines.push(cells.join('\t'));
    }
    return lines.join('\n');
  }, [range, rows, leafCols]);

  const copySelection = useCallback(async () => {
    const text = buildTsv();
    if (!text) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      onCopy?.(text);
    } catch {
      // ignore — best-effort copy
    }
  }, [buildTsv, onCopy]);

  // Tracks whether the user is currently mid-drag (left button held after a
  // primary mousedown on a cell). We use a ref so the document-level mouseup
  // listener can clear it without re-binding on every render.
  const draggingRef = useRef(false);

  // Install a document-level mouseup listener once, to end any in-progress
  // drag even if the mouse is released outside the grid.
  useEffect(() => {
    if (!enabled) return;
    const stop = () => {
      draggingRef.current = false;
    };
    document.addEventListener('mouseup', stop);
    return () => document.removeEventListener('mouseup', stop);
  }, [enabled]);

  // Clear the cell selection when the user clicks anywhere outside the grid.
  // Clicks inside the grid (cells, header, toolbar) are left alone — cell
  // clicks manage the range themselves. Clicks inside MUI portal layers
  // (context menu, chart dialog, column/filter menus) are ignored so their
  // actions can still read the live range before it's cleared.
  useEffect(() => {
    if (!enabled) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (rootRef?.current?.contains(target)) return;
      if (
        target.closest(
          '[role="menu"], [role="dialog"], [role="listbox"], [role="tooltip"], .MuiPopover-root, .MuiModal-root',
        )
      ) {
        return;
      }
      setActiveState(null);
      setAnchor(null);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [enabled, rootRef]);

  const onCellMouseDown = useCallback(
    (e: React.MouseEvent, rowIndex: number, colIndex: number) => {
      if (!enabled) return;
      // Only the primary (left) button starts a drag-select. Right/middle
      // clicks must NOT reset the range — otherwise right-clicking inside a
      // selection wipes it before the context menu opens (mousedown fires
      // before contextmenu).
      if (e.button !== 0) return;
      // Ignore clicks on interactive elements (checkbox, button, link, input)
      const tag = (e.target as HTMLElement).closest('button, input, a, label, [role="button"]');
      if (tag) return;
      // Prevent the browser's native text selection on drag — we own the
      // selection model. preventDefault on mousedown also blocks the implicit
      // focus shift, so we have to move keyboard focus to the grid container
      // ourselves; otherwise arrow keys wouldn't work after a mouse click.
      e.preventDefault();
      const root = (e.currentTarget as HTMLElement).closest<HTMLElement>('[tabindex]');
      root?.focus({ preventScroll: true });
      const c: CellPos = { rowIndex, colIndex };
      if (e.shiftKey && anchor) {
        // Shift+click extends the existing range from the anchor.
        setActiveState(c);
        draggingRef.current = true;
        return;
      }
      setActiveState(c);
      setAnchor(c);
      draggingRef.current = true;
    },
    [enabled, anchor],
  );

  const onCellMouseEnter = useCallback(
    (e: React.MouseEvent, rowIndex: number, colIndex: number) => {
      if (!enabled) return;
      if (!draggingRef.current) return;
      // If the user released the button outside the grid and re-entered, the
      // buttons bitmask will be 0 — clear our drag flag defensively.
      if (e.buttons === 0) {
        draggingRef.current = false;
        return;
      }
      setActiveState((prev) => {
        if (prev && prev.rowIndex === rowIndex && prev.colIndex === colIndex) return prev;
        return { rowIndex, colIndex };
      });
    },
    [enabled],
  );

  const onCellClick = useCallback(
    (_e: React.MouseEvent, _r: number, _c: number) => {
      // reserved for future double-click hooks
    },
    [],
  );

  const onCellContextMenu = useCallback(
    (_e: React.MouseEvent, rowIndex: number, colIndex: number) => {
      // If the right-click happened outside the current range, collapse the
      // range to just this cell so subsequent actions operate on it.
      // (Right-click inside the range preserves it — that's the whole point of
      // the context menu actions like "Chart range" / "Copy".)
      if (!isInRange(rowIndex, colIndex)) {
        const c: CellPos = { rowIndex, colIndex };
        setActiveState(c);
        setAnchor(c);
      }
      // We don't preventDefault here — the caller (DataGrid) wires its own
      // menu and decides whether to suppress the native context menu.
    },
    [isInRange],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!enabled) return;
      // ignore key events from inputs inside the grid (filter row, etc.)
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Copy
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (range) {
          e.preventDefault();
          void copySelection();
        }
        return;
      }

      if (!active) {
        if (rowCount === 0 || colCount === 0) return;
        if (
          ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageDown', 'PageUp'].includes(e.key)
        ) {
          e.preventDefault();
          setActive({ rowIndex: 0, colIndex: 0 });
        }
        return;
      }

      const extend = e.shiftKey;
      let next: CellPos = { ...active };
      let handled = true;
      switch (e.key) {
        case 'ArrowDown':
          next.rowIndex = Math.min(rowCount - 1, active.rowIndex + 1);
          break;
        case 'ArrowUp':
          next.rowIndex = Math.max(0, active.rowIndex - 1);
          break;
        case 'ArrowRight':
          next.colIndex = Math.min(colCount - 1, active.colIndex + 1);
          break;
        case 'ArrowLeft':
          next.colIndex = Math.max(0, active.colIndex - 1);
          break;
        case 'Home':
          if (e.ctrlKey || e.metaKey) next.rowIndex = 0;
          next.colIndex = 0;
          break;
        case 'End':
          if (e.ctrlKey || e.metaKey) next.rowIndex = rowCount - 1;
          next.colIndex = colCount - 1;
          break;
        case 'PageDown':
          next.rowIndex = Math.min(rowCount - 1, active.rowIndex + pageSize);
          break;
        case 'PageUp':
          next.rowIndex = Math.max(0, active.rowIndex - pageSize);
          break;
        case 'Escape':
          setActiveState(null);
          setAnchor(null);
          handled = true;
          break;
        case ' ':
          // toggle row selection if selection is enabled
          {
            const row = rows[active.rowIndex];
            if (row?.getCanSelect()) {
              row.toggleSelected();
              handled = true;
            } else {
              handled = false;
            }
          }
          break;
        case 'Enter':
          {
            const row = rows[active.rowIndex];
            if (row?.getCanExpand()) {
              row.toggleExpanded();
              handled = true;
            } else {
              handled = false;
            }
          }
          break;
        default:
          handled = false;
      }
      if (!handled) return;
      e.preventDefault();
      if (e.key !== 'Escape') {
        setActiveState(next);
        if (!extend) setAnchor(next);
        scrollToActive(next);
      }
    },
    [enabled, active, rowCount, colCount, pageSize, rows, range, copySelection, scrollToActive, setActive],
  );

  // Clamp active when rows/cols shrink (e.g. after filtering)
  useEffect(() => {
    if (!active) return;
    const next = clamp(active);
    if (next.rowIndex !== active.rowIndex || next.colIndex !== active.colIndex) {
      setActiveState(next);
      setAnchor(next);
    }
  }, [active, clamp]);

  const clear = useCallback(() => {
    setActiveState(null);
    setAnchor(null);
  }, []);

  return {
    active,
    setActive,
    anchor,
    range,
    isInRange,
    isActive,
    onCellMouseDown,
    onCellMouseEnter,
    onCellClick,
    onCellContextMenu,
    onKeyDown,
    copySelection,
    clear,
  };
}

// re-export ref helper for callers
export const cellInteractionAttrs = (rowIndex: number, colIndex: number) => ({
  'data-row-index': rowIndex,
  'data-col-index': colIndex,
});
