import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Box,
  Checkbox,
  CircularProgress,
  Table as MuiTable,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { flexRender, type Row } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

import { useDataGridState } from './hooks/useDataGridState';
import { cellInteractionAttrs, useCellInteraction } from './hooks/useCellInteraction';
import { Toolbar } from './components/Toolbar';
import { FilterRow } from './components/FilterRow';
import { PaginationFooter } from './components/PaginationFooter';
import { AdvancedFilterPanel } from './components/AdvancedFilterPanel';
import { SortableHeaderRow } from './components/SortableHeaderRow';
import { GroupZone, GROUP_ZONE_ID } from './components/GroupZone';
import { StatusBar } from './components/StatusBar';
import { ChartDialog } from './components/ChartDialog';
import { PivotPanel } from './components/PivotPanel';
import { PinnedRows } from './components/PinnedRows';
import { CellContextMenu, type CellContextMenuAnchor } from './components/CellContextMenu';
import { buildPivot, type PivotConfig } from './pivot/buildPivot';
import { exportTableToExcel } from './export/toExcel';
import type { ChartConfig } from './charts/buildOption';
import { exportTableToCsv } from './export/toCsv';
import { generateColumns } from './columns/generateColumns';
import { isDataGridConfig, resolveDataGridConfig } from './columns/columnConfig';
import {
  BodyCell,
  BodyRow,
  FooterBar,
  GridRoot,
  GridTableContainer,
  GroupCellInner,
  OverlayBox,
  StickyHead,
  densityToRowHeight,
} from './styled';
import type { DataGridColumnDef, DataGridColumnMeta, DataGridProps } from './types';

const SELECTION_COL_ID = '__select__';

export function DataGrid<T>(props: DataGridProps<T>) {
  const {
    columns,
    rows: rawRows,
    loading,
    error,
    pagination = { mode: 'client', pageSize: 25, pageSizeOptions: [10, 25, 50, 100] },
    selection,
    enableColumnResizing = true,
    enableColumnReorder = true,
    enableColumnPinning = true,
    enableDragToGroup = true,
    enableGrouping = true,
    enableVirtualization = true,
    slots,
    height = 560,
    className,
    enableCsvExport = true,
    csvFileName = 'export.csv',
    toolbar,
    emptyText = 'N/A',
    enableKeyboardNavigation = true,
    enableRangeSelection = true,
    enableClipboardCopy = true,
    onClipboardCopy,
    enableStatusBar = true,
    enableCharts = true,
    enableExcelExport = true,
    excelFileName = 'export.xlsx',
    enablePivot = true,
    renderDetailPanel,
    pinnedRowsTop,
    pinnedRowsBottom,
  } = props;

  const showToolbar = toolbar !== false;

  // A serializable `DataGridConfig` resolves to runtime column defs plus the
  // initial state it implies (hidden columns, group-by, sorting); a plain
  // column-def array is used as-is. Either way we fall back to columns derived
  // from the data when nothing usable is supplied.
  const resolvedConfig = useMemo(
    () => (isDataGridConfig<T>(columns) ? resolveDataGridConfig<T>(columns) : null),
    [columns],
  );
  const suppliedColumns = resolvedConfig
    ? resolvedConfig.columns
    : (columns as DataGridColumnDef<T>[] | undefined);
  const baseColumns = useMemo(
    () =>
      suppliedColumns && suppliedColumns.length > 0 ? suppliedColumns : generateColumns(rawRows),
    [suppliedColumns, rawRows],
  );

  // Config-derived initial state seeds the grid; an explicit `initialState`
  // prop still wins so callers can override a stored layout.
  const initialState = useMemo(
    () =>
      resolvedConfig
        ? { ...resolvedConfig.initialState, ...props.initialState }
        : props.initialState,
    [resolvedConfig, props.initialState],
  );

  // -- Pivot ---------------------------------------------------------------
  const [pivotOpen, setPivotOpen] = useState(false);
  const [pivotEnabled, setPivotEnabled] = useState(false);
  const [pivotCfg, setPivotCfg] = useState<PivotConfig>({
    rowGroupCols: [],
    colGroupCols: [],
    valueCols: [],
  });
  const headerLabels = useMemo(() => {
    const out: Record<string, string> = {};
    for (const c of baseColumns) {
      const id =
        (c as { id?: string; accessorKey?: string }).id ??
        (c as { accessorKey?: string }).accessorKey ??
        '';
      if (id) out[id] = String((c as { header?: unknown }).header ?? id);
    }
    return out;
  }, [baseColumns]);
  const isPivotActive =
    enablePivot && pivotEnabled && pivotCfg.rowGroupCols.length > 0 && pivotCfg.valueCols.length > 0;
  const pivoted = useMemo(() => {
    if (!isPivotActive) return null;
    return buildPivot(rawRows as Record<string, unknown>[], pivotCfg, headerLabels);
  }, [isPivotActive, rawRows, pivotCfg, headerLabels]);

  const enrichedColumns = useMemo(() => {
    const out =
      isPivotActive && pivoted
        ? (pivoted.columns as unknown as DataGridColumnDef<T>[])
        : [...baseColumns];
    if (selection && !isPivotActive) {
      out.unshift({
        id: SELECTION_COL_ID,
        size: 44,
        enableSorting: false,
        enableColumnFilter: false,
        enableHiding: false,
        enableResizing: false,
        meta: { hideable: false } as DataGridColumnMeta<T>,
        header: ({ table }) =>
          selection.mode === 'multi' ? (
            <Checkbox
              size="small"
              checked={table.getIsAllRowsSelected()}
              indeterminate={table.getIsSomeRowsSelected()}
              onChange={table.getToggleAllRowsSelectedHandler()}
            />
          ) : null,
        cell: ({ row }) => (
          <Checkbox
            size="small"
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      });
    }
    return out;
  }, [baseColumns, selection, isPivotActive, pivoted]);

  const effectiveRows =
    isPivotActive && pivoted ? (pivoted.rows as unknown as typeof rawRows) : rawRows;

  const { table, state, setters } = useDataGridState({
    ...props,
    rows: effectiveRows,
    columns: enrichedColumns,
    initialState,
    enableColumnResizing,
    enableColumnPinning,
    // Disable client grouping while pivoting — the pivot rows are already aggregated.
    enableGrouping: enableGrouping && !isPivotActive,
  });

  const [advOpen, setAdvOpen] = useState(false);

  const handleExport = useCallback(() => {
    exportTableToCsv(table, csvFileName);
  }, [table, csvFileName]);
  const handleExcelExport = useCallback(() => {
    void exportTableToExcel(table, excelFileName);
  }, [table, excelFileName]);

  // -- Chart dialog manager -------------------------------------------------
  interface ChartInstance {
    id: string;
    initial?: Partial<ChartConfig>;
    /** Range snapshot captured at the moment this chart was opened. When
     *  present, the chart starts in "linked" mode and follows the live range. */
    linkedRange?: { startRow: number; endRow: number; startCol: number; endCol: number } | null;
  }
  const [charts, setCharts] = useState<ChartInstance[]>([]);
  const chartIdRef = useRef(0);
  const openChart = useCallback((rangeSnapshot?: ChartInstance['linkedRange']) => {
    chartIdRef.current += 1;
    setCharts((prev) => [...prev, { id: `c${chartIdRef.current}`, linkedRange: rangeSnapshot ?? null }]);
  }, []);
  const closeChart = useCallback((id: string) => {
    setCharts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // -- Cell context menu ----------------------------------------------------
  const [contextMenu, setContextMenu] = useState<CellContextMenuAnchor | null>(null);
  // Bumped whenever state changes so open charts re-render against latest rows.
  const gridStateVersion = useMemo(
    () => JSON.stringify({
      s: state.sorting,
      f: state.columnFilters,
      g: state.globalFilter,
      gr: state.grouping,
      ex: state.expanded,
      p: state.pagination,
      adv: state.advancedFilter ? 'a' : 'b',
      pv: isPivotActive,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.sorting, state.columnFilters, state.globalFilter, state.grouping, state.expanded, state.pagination, state.advancedFilter, isPivotActive],
  ).length;

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const rowModel = table.getRowModel();
  const rowHeight = densityToRowHeight[state.density];

  const paginating = pagination !== false;
  const paginationOpts: { pageSize?: number; pageSizeOptions?: number[] } | undefined =
    paginating ? (pagination as { pageSize?: number; pageSizeOptions?: number[] }) : undefined;
  const useVirtual = enableVirtualization && !paginating;

  const virtualizer = useVirtualizer({
    count: rowModel.rows.length,
    getScrollElement: () => scrollerRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
    enabled: useVirtual,
  });

  const virtualItems = useVirtual ? virtualizer.getVirtualItems() : [];
  const totalSize = useVirtual ? virtualizer.getTotalSize() : 0;
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0;

  const rowsToRender = useVirtual
    ? virtualItems.map((vi) => rowModel.rows[vi.index])
    : rowModel.rows;

  const isEmpty = !loading && rowModel.rows.length === 0;

  const cellInteraction = useCellInteraction<T>({
    table,
    virtualizer: useVirtual ? virtualizer : null,
    enabled: enableKeyboardNavigation || enableRangeSelection || enableClipboardCopy,
    scrollerRef,
    rootRef,
    pageSize: paginating
      ? table.getState().pagination.pageSize
      : Math.max(1, Math.floor((typeof height === 'number' ? height : 600) / rowHeight)),
    onCopy: enableClipboardCopy ? onClipboardCopy : undefined,
  });

  // DnD wiring (column reorder + drag-to-group). One DndContext spans the
  // header row and the group zone so a drag can target either.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [draggingColId, setDraggingColId] = useState<string | null>(null);
  const handleDragStart = (e: DragStartEvent) => setDraggingColId(String(e.active.id));
  const handleDragEnd = (e: DragEndEvent) => {
    setDraggingColId(null);
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    // Drop on the group zone → toggle grouping for that column
    if (overId === GROUP_ZONE_ID) {
      const col = table.getColumn(activeId);
      if (col && col.getCanGroup() && !col.getIsGrouped()) {
        col.toggleGrouping();
      }
      return;
    }
    if (activeId === overId) return;
    // Otherwise it was a reorder drop on another header
    const currentOrder =
      table.getState().columnOrder.length > 0
        ? table.getState().columnOrder
        : table.getAllLeafColumns().map((c) => c.id);
    const oldIndex = currentOrder.indexOf(activeId);
    const newIndex = currentOrder.indexOf(overId);
    if (oldIndex < 0 || newIndex < 0) return;
    table.setColumnOrder(arrayMove(currentOrder, oldIndex, newIndex));
  };

  const draggingHeader = draggingColId ? table.getColumn(draggingColId) : null;

  return (
    <GridRoot
      ref={rootRef}
      className={className}
      sx={{ height }}
      tabIndex={0}
      onKeyDown={cellInteraction.onKeyDown}
    >
      {showToolbar && (
        <Toolbar
          table={table}
          showFilters={state.showFilters}
          onToggleFilters={() => setters.setShowFilters(!state.showFilters)}
          globalFilter={state.globalFilter}
          onGlobalFilterChange={setters.setGlobalFilter}
          onOpenAdvanced={() => setAdvOpen(true)}
          advancedFilter={state.advancedFilter}
          density={state.density}
          onDensityChange={setters.setDensity}
          enableGrouping={enableGrouping && !isPivotActive}
          enableCsvExport={enableCsvExport}
          onExportCsv={handleExport}
          enableCharts={enableCharts}
          onNewChart={() => openChart(cellInteraction.range ?? null)}
          hasRange={!!cellInteraction.range}
          enableExcelExport={enableExcelExport}
          onExportExcel={handleExcelExport}
          enablePivot={enablePivot}
          onOpenPivot={() => setPivotOpen(true)}
          extras={slots?.toolbarExtras}
        />
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDraggingColId(null)}
      >
        <GroupZone table={table} visible={enableGrouping && enableDragToGroup} />
      <GridTableContainer ref={scrollerRef}>
        <MuiTable
          stickyHeader
          size="small"
          sx={{ tableLayout: 'fixed', width: table.getTotalSize() || '100%' }}
        >
          <StickyHead>
            {table.getHeaderGroups().map((hg, hgIdx, all) => (
              <SortableHeaderRow
                key={hg.id}
                headerGroup={hg}
                density={state.density}
                groupingActive={state.grouping.length > 0}
                currentAggregations={state.aggregationOverrides}
                onSetAggregation={setters.setAggregation}
                // Reorder only on the leaf (bottom-most) header row. Group
                // headers span multiple leaves and would need a different DnD
                // strategy to move whole subtrees.
                enableReorder={enableColumnReorder && hgIdx === all.length - 1}
              />
            ))}
            {state.showFilters && (
              <FilterRow
                table={table}
                headers={
                  table.getHeaderGroups()[table.getHeaderGroups().length - 1]?.headers ?? []
                }
              />
            )}
          </StickyHead>
          <TableBody>
            {pinnedRowsTop && pinnedRowsTop.length > 0 && (
              <PinnedRows table={table} rows={pinnedRowsTop} density={state.density} position="top" />
            )}
            {paddingTop > 0 && (
              <tr style={{ height: paddingTop }}>
                <td colSpan={table.getVisibleLeafColumns().length} />
              </tr>
            )}
            {rowsToRender.flatMap((row, i) => {
              const rowIndex = useVirtual ? virtualItems[i].index : i;
              const isExpanded = row.getIsExpanded();
              const nodes = [
                <DataRow
                  key={row.id}
                  row={row}
                  rowIndex={rowIndex}
                  density={state.density}
                  cellInteraction={cellInteraction}
                  canExpandDetail={!!renderDetailPanel && !row.getIsGrouped()}
                  emptyText={emptyText}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY });
                  }}
                />,
              ];
              if (renderDetailPanel && isExpanded && !row.getIsGrouped()) {
                nodes.push(
                  <TableRow key={`${row.id}__detail`}>
                    <TableCell
                      colSpan={table.getVisibleLeafColumns().length}
                      sx={{ p: 0, background: 'action.hover', borderBottom: 1, borderColor: 'divider' }}
                    >
                      <Box sx={{ p: 2 }}>{renderDetailPanel(row.original)}</Box>
                    </TableCell>
                  </TableRow>,
                );
              }
              return nodes;
            })}
            {paddingBottom > 0 && (
              <tr style={{ height: paddingBottom }}>
                <td colSpan={table.getVisibleLeafColumns().length} />
              </tr>
            )}
            {isEmpty && (
              <TableRow>
                <TableCell colSpan={table.getVisibleLeafColumns().length} align="center" sx={{ py: 6 }}>
                  {slots?.noRowsOverlay ?? (
                    <Typography color="text.secondary">No rows</Typography>
                  )}
                </TableCell>
              </TableRow>
            )}
            {pinnedRowsBottom && pinnedRowsBottom.length > 0 && (
              <PinnedRows table={table} rows={pinnedRowsBottom} density={state.density} position="bottom" />
            )}
          </TableBody>
        </MuiTable>
        {loading && (
          <OverlayBox>
            {slots?.loadingOverlay ?? <CircularProgress size={28} />}
          </OverlayBox>
        )}
        {error && (
          <OverlayBox>
            {slots?.errorOverlay ?? (
              <Typography color="error">{error}</Typography>
            )}
          </OverlayBox>
        )}
      </GridTableContainer>
        <DragOverlay>
          {draggingHeader ? (
            <div
              style={{
                padding: '6px 10px',
                background: 'white',
                border: '1px solid #ccc',
                borderRadius: 4,
                boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
                fontWeight: 600,
                cursor: 'grabbing',
              }}
            >
              {String(draggingHeader.columnDef.header ?? draggingHeader.id)}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      {paginating && (
        <FooterBar>
          <PaginationFooter
            table={table}
            pageSizeOptions={paginationOpts?.pageSizeOptions ?? [10, 25, 50, 100]}
          />
        </FooterBar>
      )}
      {enableStatusBar && <StatusBar table={table} range={cellInteraction.range} />}
      <AdvancedFilterPanel
        open={advOpen}
        onClose={() => setAdvOpen(false)}
        table={table}
        value={state.advancedFilter}
        onChange={setters.setAdvancedFilter}
      />
      <PivotPanel
        open={pivotOpen}
        onClose={() => setPivotOpen(false)}
        table={table}
        enabled={pivotEnabled}
        onEnabledChange={setPivotEnabled}
        config={pivotCfg}
        onChange={setPivotCfg}
      />
      {charts.map((c) => (
        <ChartDialog
          key={c.id}
          open
          onClose={() => closeChart(c.id)}
          table={table}
          initialConfig={c.initial}
          gridStateVersion={gridStateVersion}
          linkedRange={c.linkedRange ?? null}
          getLiveRange={() => cellInteraction.range}
        />
      ))}
      <CellContextMenu
        anchor={contextMenu}
        onClose={() => setContextMenu(null)}
        hasRange={!!cellInteraction.range}
        onChartRange={() => openChart(cellInteraction.range ?? null)}
        onCopy={() => {
          void cellInteraction.copySelection();
        }}
        onCopyWithHeaders={() => {
          // Reuse the standard CSV writer scoped to the range — simplest path
          // to "copy with headers" without a second TSV builder. We turn it
          // into a TSV-like string by replacing commas with tabs on rows
          // that don't contain embedded commas. For richer cases the user can
          // export CSV directly.
          void copyRangeWithHeaders(table, cellInteraction.range);
        }}
      />
    </GridRoot>
  );
}

// Build a TSV from the selected range PLUS a header row, then put it on the
// clipboard. Kept inline (single use-site) to avoid a second copy module.
async function copyRangeWithHeaders<T>(
  table: import('@tanstack/react-table').Table<T>,
  range: { startRow: number; endRow: number; startCol: number; endCol: number } | null,
) {
  if (!range) return;
  const rows = table.getRowModel().rows;
  const cols = table.getVisibleLeafColumns();
  const lines: string[] = [];
  const headerRow: string[] = [];
  for (let c = range.startCol; c <= range.endCol; c++) {
    headerRow.push(String(cols[c]?.columnDef.header ?? cols[c]?.id ?? ''));
  }
  lines.push(headerRow.join('\t'));
  for (let r = range.startRow; r <= range.endRow; r++) {
    const row = rows[r];
    if (!row) continue;
    const out: string[] = [];
    for (let c = range.startCol; c <= range.endCol; c++) {
      const col = cols[c];
      if (!col) continue;
      const raw = row.getValue(col.id);
      out.push(raw == null ? '' : String(raw).replace(/\t/g, ' ').replace(/\r?\n/g, ' '));
    }
    lines.push(out.join('\t'));
  }
  const text = lines.join('\n');
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* ignore */
  }
}

function DataRow<T>({
  row,
  rowIndex,
  density,
  cellInteraction,
  canExpandDetail,
  emptyText,
  onContextMenu,
}: {
  row: Row<T>;
  rowIndex: number;
  density: 'compact' | 'standard' | 'comfortable';
  cellInteraction: ReturnType<typeof useCellInteraction<T>>;
  canExpandDetail?: boolean;
  emptyText: ReactNode;
  onContextMenu?: (e: React.MouseEvent, rowIndex: number, colIndex: number) => void;
}) {
  const isAgg = row.getIsGrouped();
  return (
    <BodyRow selected={row.getIsSelected()} aggregated={isAgg} data-row-index={rowIndex}>
      {row.getVisibleCells().map((cell, colIndex) => {
        const meta = cell.column.columnDef.meta as DataGridColumnMeta<T> | undefined;
        const align = meta?.align;
        const pinned = cell.column.getIsPinned();
        const pinSide: 'left' | 'right' | null =
          pinned === 'left' ? 'left' : pinned === 'right' ? 'right' : null;
        const pinStyle: React.CSSProperties = pinSide
          ? {
              position: 'sticky',
              left: pinSide === 'left' ? cell.column.getStart(pinSide) : undefined,
              right: pinSide === 'right' ? cell.column.getAfter(pinSide) : undefined,
              zIndex: 1,
              background: 'inherit',
              boxShadow:
                pinSide === 'left'
                  ? '2px 0 4px -2px rgba(0,0,0,0.15)'
                  : '-2px 0 4px -2px rgba(0,0,0,0.15)',
            }
          : {};
        const interactionProps = {
          ...cellInteractionAttrs(rowIndex, colIndex),
          onMouseDown: (e: React.MouseEvent) => cellInteraction.onCellMouseDown(e, rowIndex, colIndex),
          onMouseEnter: (e: React.MouseEvent) => cellInteraction.onCellMouseEnter(e, rowIndex, colIndex),
          onClick: (e: React.MouseEvent) => cellInteraction.onCellClick(e, rowIndex, colIndex),
          onContextMenu: (e: React.MouseEvent) => {
            cellInteraction.onCellContextMenu(e, rowIndex, colIndex);
            onContextMenu?.(e, rowIndex, colIndex);
          },
          isActive: cellInteraction.isActive(rowIndex, colIndex),
          isInRange: cellInteraction.isInRange(rowIndex, colIndex),
        };
        const baseStyle: React.CSSProperties = { width: cell.column.getSize(), ...pinStyle };
        if (cell.getIsGrouped()) {
          return (
            <BodyCell
              key={cell.id}
              density={density}
              align={align}
              style={{ ...baseStyle, paddingLeft: 8 + row.depth * 16 }}
              {...interactionProps}
            >
              <GroupCellInner
                role="button"
                onClick={row.getToggleExpandedHandler()}
                sx={{ cursor: 'pointer' }}
              >
                {row.getIsExpanded() ? (
                  <KeyboardArrowDownIcon fontSize="small" />
                ) : (
                  <KeyboardArrowRightIcon fontSize="small" />
                )}
                <strong>{flexRender(cell.column.columnDef.cell, cell.getContext())}</strong>
                <Box component="span" sx={{ ml: 0.5, color: 'text.secondary' }}>
                  ({row.subRows.length})
                </Box>
              </GroupCellInner>
            </BodyCell>
          );
        }
        if (cell.getIsAggregated()) {
          if (!meta?.aggregationFn) {
            return (
              <BodyCell
                key={cell.id}
                density={density}
                align={align}
                style={{ width: cell.column.getSize() }}
                {...interactionProps}
              />
            );
          }
          const aggCell = cell.column.columnDef.aggregatedCell ?? cell.column.columnDef.cell;
          return (
            <BodyCell
              key={cell.id}
              density={density}
              align={align}
              style={baseStyle}
              {...interactionProps}
            >
              <em>{flexRender(aggCell, cell.getContext())}</em>
            </BodyCell>
          );
        }
        if (cell.getIsPlaceholder()) {
          return (
            <BodyCell
              key={cell.id}
              density={density}
              align={align}
              style={baseStyle}
              {...interactionProps}
            />
          );
        }
        const visible = row.getVisibleCells();
        const firstDataColIdx = visible[0]?.column.id === SELECTION_COL_ID ? 1 : 0;
        const showDetailChevron = !!canExpandDetail && colIndex === firstDataColIdx;
        const classNames: string[] = [];
        if (meta?.cellClassRules) {
          const v = cell.getValue();
          for (const [cls, predicate] of Object.entries(meta.cellClassRules)) {
            try {
              if (predicate(v, row.original)) classNames.push(cls);
            } catch {
              /* ignore */
            }
          }
        }
        const value = cell.getValue();
        // Only data (accessor) columns get the placeholder — display/action
        // columns (e.g. the selection checkbox) have no accessor and would
        // otherwise read as "empty" and lose their custom cell.
        const isEmpty = !!cell.column.accessorFn && (value == null || value === '');
        return (
          <BodyCell
            key={cell.id}
            density={density}
            align={align}
            style={baseStyle}
            className={classNames.join(' ') || undefined}
            {...interactionProps}
          >
            {isEmpty ? (
              <Box component="span" sx={{ color: 'text.disabled' }}>
                {emptyText}
              </Box>
            ) : showDetailChevron ? (
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                <Box
                  component="span"
                  role="button"
                  aria-label={row.getIsExpanded() ? 'Collapse detail' : 'Expand detail'}
                  onClick={(e) => {
                    e.stopPropagation();
                    row.toggleExpanded();
                  }}
                  sx={{ cursor: 'pointer', display: 'inline-flex' }}
                >
                  {row.getIsExpanded() ? (
                    <KeyboardArrowDownIcon fontSize="small" />
                  ) : (
                    <KeyboardArrowRightIcon fontSize="small" />
                  )}
                </Box>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </Box>
            ) : (
              flexRender(cell.column.columnDef.cell, cell.getContext())
            )}
          </BodyCell>
        );
      })}
    </BodyRow>
  );
}
