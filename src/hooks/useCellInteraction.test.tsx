import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { useRef } from 'react';
import { useCellInteraction } from './useCellInteraction';

interface Row {
  id: number;
  name: string;
  value: number;
}

const data: Row[] = [
  { id: 1, name: 'alpha', value: 10 },
  { id: 2, name: 'bravo', value: 20 },
  { id: 3, name: 'charlie', value: 30 },
  { id: 4, name: 'delta', value: 40 },
  { id: 5, name: 'echo', value: 50 },
];

const defaultColumns: ColumnDef<Row>[] = [
  { id: 'id', accessorKey: 'id', header: 'ID' },
  { id: 'name', accessorKey: 'name', header: 'Name' },
  { id: 'value', accessorKey: 'value', header: 'Value' },
];

function useHarness(opts?: {
  columns?: ColumnDef<Row>[];
  onCopy?: (text: string) => void;
  enabled?: boolean;
  rootEl?: HTMLElement | null;
}) {
  const columns = opts?.columns ?? defaultColumns;
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  const scrollerRef = useRef<HTMLDivElement | null>(document.createElement('div'));
  const rootRef = useRef<HTMLElement | null>(opts?.rootEl ?? null);
  return useCellInteraction<Row>({
    table,
    virtualizer: null,
    enabled: opts?.enabled ?? true,
    onCopy: opts?.onCopy,
    scrollerRef,
    rootRef,
    pageSize: 5,
  });
}

/**
 * Build a minimal MouseEvent-shaped shim that the hook actually reads from.
 * currentTarget is a real <td> so `.closest('[tabindex]')` returns null safely.
 */
function mouseShim(overrides: Partial<{
  button: number;
  buttons: number;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  target: HTMLElement;
  currentTarget: HTMLElement;
}> = {}) {
  const target = overrides.target ?? document.createElement('td');
  const currentTarget = overrides.currentTarget ?? document.createElement('td');
  return {
    button: overrides.button ?? 0,
    buttons: overrides.buttons ?? 1,
    shiftKey: overrides.shiftKey ?? false,
    ctrlKey: overrides.ctrlKey ?? false,
    metaKey: overrides.metaKey ?? false,
    target,
    currentTarget,
    preventDefault: () => {},
    stopPropagation: () => {},
  } as unknown as React.MouseEvent;
}

function keyShim(overrides: Partial<{
  key: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  target: HTMLElement;
  preventDefault: () => void;
}> = {}) {
  const target = overrides.target ?? document.createElement('div');
  return {
    key: overrides.key ?? '',
    shiftKey: overrides.shiftKey ?? false,
    ctrlKey: overrides.ctrlKey ?? false,
    metaKey: overrides.metaKey ?? false,
    target,
    currentTarget: target,
    preventDefault: overrides.preventDefault ?? vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as React.KeyboardEvent;
}

describe('useCellInteraction', () => {
  describe('click + range basics', () => {
    it('mousedown sets active and anchor to clicked cell, range is 1x1', () => {
      const { result } = renderHook(() => useHarness());
      act(() => {
        result.current.onCellMouseDown(mouseShim(), 1, 2);
      });
      expect(result.current.active).toEqual({ rowIndex: 1, colIndex: 2 });
      expect(result.current.anchor).toEqual({ rowIndex: 1, colIndex: 2 });
      expect(result.current.range).toEqual({
        startRow: 1,
        endRow: 1,
        startCol: 2,
        endCol: 2,
      });
    });

    it('shift+click extends range from anchor to new active (anchor unchanged)', () => {
      const { result } = renderHook(() => useHarness());
      act(() => {
        result.current.onCellMouseDown(mouseShim(), 0, 0);
      });
      // End drag so subsequent shift+click is not a drag-extend
      act(() => {
        document.dispatchEvent(new MouseEvent('mouseup'));
      });
      act(() => {
        result.current.onCellMouseDown(mouseShim({ shiftKey: true }), 2, 1);
      });
      expect(result.current.anchor).toEqual({ rowIndex: 0, colIndex: 0 });
      expect(result.current.active).toEqual({ rowIndex: 2, colIndex: 1 });
      expect(result.current.range).toEqual({
        startRow: 0,
        endRow: 2,
        startCol: 0,
        endCol: 1,
      });
    });

    it('clear() wipes active/anchor/range', () => {
      const { result } = renderHook(() => useHarness());
      act(() => {
        result.current.onCellMouseDown(mouseShim(), 1, 1);
      });
      expect(result.current.active).not.toBeNull();
      act(() => {
        result.current.clear();
      });
      expect(result.current.active).toBeNull();
      expect(result.current.anchor).toBeNull();
      expect(result.current.range).toBeNull();
    });
  });

  describe('drag to select', () => {
    it('mousedown(left) → mouseEnter(other cell) → range covers both; anchor stays at original', () => {
      const { result } = renderHook(() => useHarness());
      act(() => {
        result.current.onCellMouseDown(mouseShim({ button: 0 }), 1, 1);
      });
      act(() => {
        result.current.onCellMouseEnter(mouseShim({ buttons: 1 }), 3, 2);
      });
      expect(result.current.anchor).toEqual({ rowIndex: 1, colIndex: 1 });
      expect(result.current.active).toEqual({ rowIndex: 3, colIndex: 2 });
      expect(result.current.range).toEqual({
        startRow: 1,
        endRow: 3,
        startCol: 1,
        endCol: 2,
      });
    });

    it('mouseEnter does nothing when no prior mousedown (no drag in progress)', () => {
      const { result } = renderHook(() => useHarness());
      act(() => {
        result.current.onCellMouseEnter(mouseShim({ buttons: 1 }), 2, 2);
      });
      expect(result.current.active).toBeNull();
      expect(result.current.anchor).toBeNull();
      expect(result.current.range).toBeNull();
    });

    it('document mouseup ends the drag — subsequent mouseEnter on third cell does not extend', () => {
      const { result } = renderHook(() => useHarness());
      act(() => {
        result.current.onCellMouseDown(mouseShim({ button: 0 }), 0, 0);
      });
      act(() => {
        result.current.onCellMouseEnter(mouseShim({ buttons: 1 }), 1, 1);
      });
      // active should now be at (1,1)
      expect(result.current.active).toEqual({ rowIndex: 1, colIndex: 1 });
      // End the drag globally
      act(() => {
        document.dispatchEvent(new MouseEvent('mouseup'));
      });
      // Now mouseEnter on a third cell should be ignored
      act(() => {
        result.current.onCellMouseEnter(mouseShim({ buttons: 1 }), 4, 2);
      });
      expect(result.current.active).toEqual({ rowIndex: 1, colIndex: 1 });
      expect(result.current.range).toEqual({
        startRow: 0,
        endRow: 1,
        startCol: 0,
        endCol: 1,
      });
    });

    it('if e.buttons === 0 on mouseEnter (button released outside grid), drag flag clears', () => {
      const { result } = renderHook(() => useHarness());
      act(() => {
        result.current.onCellMouseDown(mouseShim({ button: 0 }), 0, 0);
      });
      // first mouseEnter with buttons:0 should clear the drag flag and NOT extend
      act(() => {
        result.current.onCellMouseEnter(mouseShim({ buttons: 0 }), 2, 2);
      });
      expect(result.current.active).toEqual({ rowIndex: 0, colIndex: 0 });
      // and a subsequent mouseEnter (even with buttons:1) must not extend
      act(() => {
        result.current.onCellMouseEnter(mouseShim({ buttons: 1 }), 3, 2);
      });
      expect(result.current.active).toEqual({ rowIndex: 0, colIndex: 0 });
    });

    it('right-button mousedown does NOT start a drag', () => {
      const { result } = renderHook(() => useHarness());
      // First click somewhere normally to set up state
      act(() => {
        result.current.onCellMouseDown(mouseShim({ button: 0 }), 1, 1);
      });
      act(() => {
        document.dispatchEvent(new MouseEvent('mouseup'));
      });
      const prevActive = result.current.active;
      const prevAnchor = result.current.anchor;
      // Right-click mousedown elsewhere — should be ignored entirely
      act(() => {
        result.current.onCellMouseDown(mouseShim({ button: 2 }), 4, 2);
      });
      expect(result.current.active).toEqual(prevActive);
      expect(result.current.anchor).toEqual(prevAnchor);
      // And mouseEnter must NOT extend (no drag in progress)
      act(() => {
        result.current.onCellMouseEnter(mouseShim({ buttons: 2 }), 3, 0);
      });
      expect(result.current.active).toEqual(prevActive);
    });

    it('middle-button mousedown is also ignored', () => {
      const { result } = renderHook(() => useHarness());
      act(() => {
        result.current.onCellMouseDown(mouseShim({ button: 1 }), 2, 2);
      });
      expect(result.current.active).toBeNull();
      act(() => {
        result.current.onCellMouseEnter(mouseShim({ buttons: 4 }), 3, 1);
      });
      expect(result.current.active).toBeNull();
    });
  });

  describe('right-click range preservation', () => {
    it('right-clicking INSIDE an existing range leaves active/anchor/range unchanged', () => {
      const { result } = renderHook(() => useHarness());
      // Build a 3x2 range via drag: anchor at (0,0), active at (2,1)
      act(() => {
        result.current.onCellMouseDown(mouseShim({ button: 0 }), 0, 0);
      });
      act(() => {
        result.current.onCellMouseEnter(mouseShim({ buttons: 1 }), 2, 1);
      });
      act(() => {
        document.dispatchEvent(new MouseEvent('mouseup'));
      });
      const beforeActive = result.current.active;
      const beforeAnchor = result.current.anchor;
      const beforeRange = result.current.range;

      // Right-click mousedown inside range — must NOT touch state
      act(() => {
        result.current.onCellMouseDown(mouseShim({ button: 2 }), 1, 1);
      });
      // Then context menu inside range — also must NOT collapse
      act(() => {
        result.current.onCellContextMenu(mouseShim({ button: 2 }), 1, 1);
      });

      expect(result.current.active).toEqual(beforeActive);
      expect(result.current.anchor).toEqual(beforeAnchor);
      expect(result.current.range).toEqual(beforeRange);
    });

    it('right-clicking OUTSIDE an existing range collapses to that cell', () => {
      const { result } = renderHook(() => useHarness());
      act(() => {
        result.current.onCellMouseDown(mouseShim({ button: 0 }), 0, 0);
      });
      act(() => {
        result.current.onCellMouseEnter(mouseShim({ buttons: 1 }), 1, 1);
      });
      act(() => {
        document.dispatchEvent(new MouseEvent('mouseup'));
      });
      // Right-click outside range at (4, 2)
      act(() => {
        result.current.onCellContextMenu(mouseShim({ button: 2 }), 4, 2);
      });
      expect(result.current.active).toEqual({ rowIndex: 4, colIndex: 2 });
      expect(result.current.anchor).toEqual({ rowIndex: 4, colIndex: 2 });
      expect(result.current.range).toEqual({
        startRow: 4,
        endRow: 4,
        startCol: 2,
        endCol: 2,
      });
    });
  });

  describe('clicking outside clears selection', () => {
    let root: HTMLElement;
    const extras: HTMLElement[] = [];

    beforeEach(() => {
      root = document.createElement('div');
      document.body.appendChild(root);
    });

    afterEach(() => {
      root.remove();
      extras.forEach((el) => el.remove());
      extras.length = 0;
    });

    const dispatchMouseDown = (target: HTMLElement, button = 0) => {
      act(() => {
        target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button }));
      });
    };

    it('left mousedown outside the grid root clears active/anchor/range', () => {
      const { result } = renderHook(() => useHarness({ rootEl: root }));
      act(() => {
        result.current.onCellMouseDown(mouseShim(), 1, 1);
      });
      expect(result.current.active).not.toBeNull();

      const outside = document.createElement('div');
      document.body.appendChild(outside);
      extras.push(outside);
      dispatchMouseDown(outside);

      expect(result.current.active).toBeNull();
      expect(result.current.anchor).toBeNull();
      expect(result.current.range).toBeNull();
    });

    it('mousedown inside the grid root does NOT clear the selection', () => {
      const { result } = renderHook(() => useHarness({ rootEl: root }));
      act(() => {
        result.current.onCellMouseDown(mouseShim(), 2, 1);
      });
      const inner = document.createElement('div');
      root.appendChild(inner);
      dispatchMouseDown(inner);

      expect(result.current.active).toEqual({ rowIndex: 2, colIndex: 1 });
    });

    it('mousedown inside a portal layer (role="menu") does NOT clear the selection', () => {
      const { result } = renderHook(() => useHarness({ rootEl: root }));
      act(() => {
        result.current.onCellMouseDown(mouseShim(), 0, 0);
      });
      const menu = document.createElement('div');
      menu.setAttribute('role', 'menu');
      const item = document.createElement('div');
      menu.appendChild(item);
      document.body.appendChild(menu);
      extras.push(menu);
      dispatchMouseDown(item);

      expect(result.current.active).toEqual({ rowIndex: 0, colIndex: 0 });
    });

    it('non-primary (right) button outside the grid does NOT clear the selection', () => {
      const { result } = renderHook(() => useHarness({ rootEl: root }));
      act(() => {
        result.current.onCellMouseDown(mouseShim(), 3, 2);
      });
      const outside = document.createElement('div');
      document.body.appendChild(outside);
      extras.push(outside);
      dispatchMouseDown(outside, 2);

      expect(result.current.active).toEqual({ rowIndex: 3, colIndex: 2 });
    });
  });

  describe('keyboard navigation', () => {
    it('with no active cell, ArrowDown sets active to {0,0}', () => {
      const { result } = renderHook(() => useHarness());
      act(() => {
        result.current.onKeyDown(keyShim({ key: 'ArrowDown' }));
      });
      expect(result.current.active).toEqual({ rowIndex: 0, colIndex: 0 });
    });

    it('Arrow keys move within bounds, clamped at edges', () => {
      const { result } = renderHook(() => useHarness());
      // Seed at (0,0)
      act(() => {
        result.current.setActive({ rowIndex: 0, colIndex: 0 });
      });
      // ArrowUp at row 0 — clamped (stays at 0)
      act(() => {
        result.current.onKeyDown(keyShim({ key: 'ArrowUp' }));
      });
      expect(result.current.active).toEqual({ rowIndex: 0, colIndex: 0 });
      // ArrowLeft at col 0 — clamped (stays at 0)
      act(() => {
        result.current.onKeyDown(keyShim({ key: 'ArrowLeft' }));
      });
      expect(result.current.active).toEqual({ rowIndex: 0, colIndex: 0 });
      // ArrowDown
      act(() => {
        result.current.onKeyDown(keyShim({ key: 'ArrowDown' }));
      });
      expect(result.current.active).toEqual({ rowIndex: 1, colIndex: 0 });
      // ArrowRight
      act(() => {
        result.current.onKeyDown(keyShim({ key: 'ArrowRight' }));
      });
      expect(result.current.active).toEqual({ rowIndex: 1, colIndex: 1 });
      // ArrowUp
      act(() => {
        result.current.onKeyDown(keyShim({ key: 'ArrowUp' }));
      });
      expect(result.current.active).toEqual({ rowIndex: 0, colIndex: 1 });
      // ArrowLeft
      act(() => {
        result.current.onKeyDown(keyShim({ key: 'ArrowLeft' }));
      });
      expect(result.current.active).toEqual({ rowIndex: 0, colIndex: 0 });

      // Clamp at far edges
      act(() => {
        result.current.setActive({ rowIndex: 4, colIndex: 2 });
      });
      act(() => {
        result.current.onKeyDown(keyShim({ key: 'ArrowDown' }));
      });
      expect(result.current.active).toEqual({ rowIndex: 4, colIndex: 2 });
      act(() => {
        result.current.onKeyDown(keyShim({ key: 'ArrowRight' }));
      });
      expect(result.current.active).toEqual({ rowIndex: 4, colIndex: 2 });
    });

    it('Shift+ArrowDown extends range (anchor stays, active moves)', () => {
      const { result } = renderHook(() => useHarness());
      act(() => {
        result.current.setActive({ rowIndex: 1, colIndex: 1 });
      });
      act(() => {
        result.current.onKeyDown(keyShim({ key: 'ArrowDown', shiftKey: true }));
      });
      expect(result.current.anchor).toEqual({ rowIndex: 1, colIndex: 1 });
      expect(result.current.active).toEqual({ rowIndex: 2, colIndex: 1 });
      expect(result.current.range).toEqual({
        startRow: 1,
        endRow: 2,
        startCol: 1,
        endCol: 1,
      });
    });

    it('Ctrl/Meta+Home moves to {0,0}; Ctrl/Meta+End moves to last cell', () => {
      const { result } = renderHook(() => useHarness());
      act(() => {
        result.current.setActive({ rowIndex: 2, colIndex: 1 });
      });
      act(() => {
        result.current.onKeyDown(keyShim({ key: 'Home', ctrlKey: true }));
      });
      expect(result.current.active).toEqual({ rowIndex: 0, colIndex: 0 });
      act(() => {
        result.current.onKeyDown(keyShim({ key: 'End', metaKey: true }));
      });
      expect(result.current.active).toEqual({ rowIndex: 4, colIndex: 2 });
    });

    it('Escape clears active/anchor', () => {
      const { result } = renderHook(() => useHarness());
      act(() => {
        result.current.setActive({ rowIndex: 2, colIndex: 1 });
      });
      act(() => {
        result.current.onKeyDown(keyShim({ key: 'Escape' }));
      });
      expect(result.current.active).toBeNull();
      expect(result.current.anchor).toBeNull();
    });
  });

  describe('clipboard copy', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('after selecting a 2x2 range, copySelection writes the correct TSV to clipboard', async () => {
      const writeSpy = vi
        .spyOn(navigator.clipboard, 'writeText')
        .mockResolvedValue(undefined);
      const onCopy = vi.fn();
      const { result } = renderHook(() => useHarness({ onCopy }));

      // 2x2 range covering rows 0-1, cols 0-1 → id/name for alpha, bravo
      act(() => {
        result.current.onCellMouseDown(mouseShim({ button: 0 }), 0, 0);
      });
      act(() => {
        result.current.onCellMouseEnter(mouseShim({ buttons: 1 }), 1, 1);
      });
      act(() => {
        document.dispatchEvent(new MouseEvent('mouseup'));
      });

      await act(async () => {
        await result.current.copySelection();
      });

      const expected = ['1\talpha', '2\tbravo'].join('\n');
      expect(writeSpy).toHaveBeenCalledWith(expected);
      expect(onCopy).toHaveBeenCalledWith(expected);
    });

    it('Ctrl+C triggers a copy when a range is active', async () => {
      const writeSpy = vi
        .spyOn(navigator.clipboard, 'writeText')
        .mockResolvedValue(undefined);
      const { result } = renderHook(() => useHarness());

      act(() => {
        result.current.onCellMouseDown(mouseShim({ button: 0 }), 0, 0);
      });
      act(() => {
        result.current.onCellMouseEnter(mouseShim({ buttons: 1 }), 0, 1);
      });
      act(() => {
        document.dispatchEvent(new MouseEvent('mouseup'));
      });

      await act(async () => {
        result.current.onKeyDown(keyShim({ key: 'c', ctrlKey: true }));
        // give the queued promise a turn
        await Promise.resolve();
      });

      expect(writeSpy).toHaveBeenCalledTimes(1);
      expect(writeSpy).toHaveBeenCalledWith('1\talpha');
    });

    it('Cmd+C also triggers copy', async () => {
      const writeSpy = vi
        .spyOn(navigator.clipboard, 'writeText')
        .mockResolvedValue(undefined);
      const { result } = renderHook(() => useHarness());

      act(() => {
        result.current.onCellMouseDown(mouseShim({ button: 0 }), 0, 0);
      });

      await act(async () => {
        result.current.onKeyDown(keyShim({ key: 'C', metaKey: true }));
        await Promise.resolve();
      });

      expect(writeSpy).toHaveBeenCalledWith('1');
    });

    it('meta.exportValue is honored if present on a column', async () => {
      const writeSpy = vi
        .spyOn(navigator.clipboard, 'writeText')
        .mockResolvedValue(undefined);
      const columns: ColumnDef<Row>[] = [
        {
          id: 'id',
          accessorKey: 'id',
          header: 'ID',
          meta: { exportValue: (r: Row) => `ID-${r.id}` },
        },
        {
          id: 'name',
          accessorKey: 'name',
          header: 'Name',
          meta: { exportValue: (r: Row) => r.name.toUpperCase() },
        },
        { id: 'value', accessorKey: 'value', header: 'Value' },
      ];
      const { result } = renderHook(() => useHarness({ columns }));

      // Select row 0, cols 0..1
      act(() => {
        result.current.onCellMouseDown(mouseShim({ button: 0 }), 0, 0);
      });
      act(() => {
        result.current.onCellMouseEnter(mouseShim({ buttons: 1 }), 0, 1);
      });
      act(() => {
        document.dispatchEvent(new MouseEvent('mouseup'));
      });

      await act(async () => {
        await result.current.copySelection();
      });

      expect(writeSpy).toHaveBeenCalledWith('ID-1\tALPHA');
    });
  });
});
