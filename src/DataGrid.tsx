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

import { useDataGridState } from './hooks/useDataGridState';
import { Toolbar } from './components/Toolbar';
import { FilterRow } from './components/FilterRow';
import { HeaderCellContent } from './components/HeaderCellContent';
import { PaginationFooter } from './components/PaginationFooter';
import { AdvancedFilterPanel } from './components/AdvancedFilterPanel';
import { exportTableToCsv } from './export/toCsv';
import { generateColumns } from './columns/generateColumns';
import { isDataGridConfig, resolveDataGridConfig } from './columns/columnConfig';
import { renderChip, resolveCellStyleSpec } from './columns/cellStyle';
import {
  BodyCell,
  BodyRow,
  FooterBar,
  GridHeader,
  GridRoot,
  GridTableContainer,
  GroupCellInner,
  HeaderCell,
  OverlayBox,
  StickyHead,
  densityToRowHeight,
} from './styled';
import type { DataGridColumnDef, DataGridColumnMeta, DataGridProps } from './types';

const SELECTION_COL_ID = '__select__';

export function DataGrid<T>(props: DataGridProps<T>) {
  const {
    columns,
    rows,
    loading,
    error,
    pagination = { mode: 'client', pageSize: 25, pageSizeOptions: [10, 25, 50, 100] },
    selection,
    enableColumnResizing = true,
    enableGrouping = true,
    enableVirtualization = true,
    slots,
    height = 560,
    className,
    enableCsvExport = true,
    csvFileName = 'export.csv',
    toolbar,
    emptyText = 'N/A',
    title,
    subtitle,
  } = props;

  const showToolbar = toolbar !== false;
  const toolbarOpts = toolbar || {};
  const tools = {
    quickFilter: toolbarOpts.quickFilter ?? true,
    columnFilters: toolbarOpts.columnFilters ?? true,
    advancedFilter: toolbarOpts.advancedFilter ?? true,
    columns: toolbarOpts.columns ?? true,
    groupBy: (toolbarOpts.groupBy ?? true) && enableGrouping,
    density: toolbarOpts.density ?? true,
    export: (toolbarOpts.export ?? true) && enableCsvExport,
  };

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
    () => (suppliedColumns && suppliedColumns.length > 0 ? suppliedColumns : generateColumns(rows)),
    [suppliedColumns, rows],
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

  const enrichedColumns = useMemo(() => {
    const out = [...baseColumns];
    if (selection) {
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
  }, [baseColumns, selection]);

  const { table, state, setters } = useDataGridState({
    ...props,
    columns: enrichedColumns,
    initialState,
    enableColumnResizing,
    enableGrouping,
  });

  const [advOpen, setAdvOpen] = useState(false);

  const handleExport = useCallback(() => {
    exportTableToCsv(table, csvFileName);
  }, [table, csvFileName]);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
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

  return (
    <GridRoot className={className} sx={{ height }}>
      {(title || subtitle) && (
        <GridHeader>
          {title && <Typography variant="h6">{title}</Typography>}
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </GridHeader>
      )}
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
          tools={tools}
          onExportCsv={handleExport}
          extras={slots?.toolbarExtras}
        />
      )}
      <GridTableContainer ref={scrollerRef}>
        <MuiTable
          stickyHeader
          size="small"
          sx={{ tableLayout: 'fixed', width: table.getTotalSize() || '100%' }}
        >
          <StickyHead>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <HeaderCell
                    key={header.id}
                    density={state.density}
                    style={{ width: header.getSize() }}
                    colSpan={header.colSpan}
                  >
                    {header.isPlaceholder ? null : header.id === SELECTION_COL_ID ? (
                      flexRender(header.column.columnDef.header, header.getContext())
                    ) : (
                      <HeaderCellContent
                        header={header}
                        groupingActive={state.grouping.length > 0}
                        currentAggregation={state.aggregationOverrides[header.column.id]}
                        onSetAggregation={setters.setAggregation}
                      />
                    )}
                  </HeaderCell>
                ))}
              </TableRow>
            ))}
            {tools.columnFilters && state.showFilters && (
              <FilterRow headers={table.getHeaderGroups()[0]?.headers ?? []} />
            )}
          </StickyHead>
          <TableBody>
            {paddingTop > 0 && (
              <tr style={{ height: paddingTop }}>
                <td colSpan={table.getVisibleLeafColumns().length} />
              </tr>
            )}
            {rowsToRender.map((row) => (
              <DataRow key={row.id} row={row} density={state.density} emptyText={emptyText} />
            ))}
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
      {paginating && (
        <FooterBar>
          <PaginationFooter
            table={table}
            pageSizeOptions={paginationOpts?.pageSizeOptions ?? [10, 25, 50, 100]}
          />
        </FooterBar>
      )}
      <AdvancedFilterPanel
        open={advOpen}
        onClose={() => setAdvOpen(false)}
        table={table}
        value={state.advancedFilter}
        onChange={setters.setAdvancedFilter}
      />
    </GridRoot>
  );
}

function DataRow<T>({
  row,
  density,
  emptyText,
}: {
  row: Row<T>;
  density: 'compact' | 'standard' | 'comfortable';
  emptyText: ReactNode;
}) {
  const isAgg = row.getIsGrouped();
  return (
    <BodyRow selected={row.getIsSelected()} aggregated={isAgg}>
      {row.getVisibleCells().map((cell) => {
        const meta = cell.column.columnDef.meta as DataGridColumnMeta<T> | undefined;
        const align = meta?.align;
        if (cell.getIsGrouped()) {
          return (
            <BodyCell
              key={cell.id}
              density={density}
              align={align}
              style={{ width: cell.column.getSize(), paddingLeft: 8 + row.depth * 16 }}
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
          // Only render an aggregated cell when the column opted in via meta.aggregationFn.
          // Otherwise TanStack would surface the raw underlying value (or join of values),
          // which is rarely useful and visually noisy.
          if (!meta?.aggregationFn) {
            return (
              <BodyCell key={cell.id} density={density} align={align} style={{ width: cell.column.getSize() }} />
            );
          }
          const aggCell = cell.column.columnDef.aggregatedCell ?? cell.column.columnDef.cell;
          return (
            <BodyCell key={cell.id} density={density} align={align} style={{ width: cell.column.getSize() }}>
              <em>{flexRender(aggCell, cell.getContext())}</em>
            </BodyCell>
          );
        }
        if (cell.getIsPlaceholder()) {
          return <BodyCell key={cell.id} density={density} align={align} style={{ width: cell.column.getSize() }} />;
        }
        const value = cell.getValue();
        // Only data (accessor) columns get the placeholder — display/action
        // columns (e.g. the selection checkbox) have no accessor and would
        // otherwise read as "empty" and lose their custom cell.
        const isEmpty = !!cell.column.accessorFn && (value == null || value === '');
        const spec = resolveCellStyleSpec(value, meta?.cellStyle, meta?.styleRules);
        // a chip carries the css itself, otherwise it goes on the cell
        const isChip = spec?.variant === 'chip';
        const cellStyleCss = isChip ? undefined : spec?.css;
        const content = flexRender(cell.column.columnDef.cell, cell.getContext());
        return (
          <BodyCell
            key={cell.id}
            density={density}
            align={align}
            style={{ width: cell.column.getSize(), ...cellStyleCss }}
          >
            {isEmpty ? (
              <Box component="span" sx={{ color: 'text.disabled' }}>
                {emptyText}
              </Box>
            ) : isChip ? (
              renderChip(content, spec!.css)
            ) : (
              content
            )}
          </BodyCell>
        );
      })}
    </BodyRow>
  );
}
