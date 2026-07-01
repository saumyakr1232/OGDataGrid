import { useRef, type ReactNode } from 'react';
import {
  Box,
  CircularProgress,
  Table as MuiTable,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from '@mui/material';
import { flexRender, type Row } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';

import { FilterRow } from '../components/FilterRow';
import { HeaderCellContent } from '../components/HeaderCellContent';
import { renderChip, resolveCellStyleSpec } from '../columns/cellStyle';
import { SELECTION_COL_ID } from '../hooks/useDataGrid';
import type { CellClickParams } from '../types';
import {
  BodyCell,
  BodyRow,
  GridTableContainer,
  HeaderCell,
  OverlayBox,
  StickyHead,
  densityToRowHeight,
} from '../styled';
import type { DataGridColumnMeta, Density } from '../types';
import { useDataGridContext } from './context';

export function DataGridTable<T>() {
  const {
    table,
    state,
    tools,
    slots,
    emptyText,
    loading,
    error,
    paginating,
    enableVirtualization,
    onCellClick,
    rowHeight: rowHeightProp,
  } = useDataGridContext<T>();

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const rowModel = table.getRowModel();
  const rowHeight = rowHeightProp ?? densityToRowHeight[state.density];
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
  const paddingBottom =
    virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0;
  const rowsToRender = useVirtual ? virtualItems.map((vi) => rowModel.rows[vi.index]) : rowModel.rows;

  const isEmpty = !loading && rowModel.rows.length === 0;

  return (
    <Box sx={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <GridTableContainer ref={scrollerRef}>
        <MuiTable
          stickyHeader
          size="small"
          sx={{
            tableLayout: 'fixed',
            width: table.getTotalSize() || '100%',
            // Default: keep each body cell on one line and truncate with an
            // ellipsis. `wrapText` lets the user opt back into wrapping.
            ...(state.wrapText
              ? null
              : {
                  '& tbody td': {
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  },
                }),
          }}
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
                    <HeaderCellContent header={header} />
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
            <DataRow
              key={row.id}
              row={row}
              density={state.density}
              emptyText={emptyText}
              onCellClick={onCellClick}
              rowHeight={rowHeightProp}
            />
          ))}
          {paddingBottom > 0 && (
            <tr style={{ height: paddingBottom }}>
              <td colSpan={table.getVisibleLeafColumns().length} />
            </tr>
          )}
          {isEmpty && (
            <TableRow>
              <TableCell colSpan={table.getVisibleLeafColumns().length} align="center" sx={{ py: 6 }}>
                {slots?.noRowsOverlay ?? <Typography color="text.secondary">No rows</Typography>}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        </MuiTable>
      </GridTableContainer>
      {loading && <OverlayBox>{slots?.loadingOverlay ?? <CircularProgress size={28} />}</OverlayBox>}
      {error && (
        <OverlayBox>{slots?.errorOverlay ?? <Typography color="error">{error}</Typography>}</OverlayBox>
      )}
    </Box>
  );
}

function DataRow<T>({
  row,
  density,
  emptyText,
  onCellClick,
  rowHeight,
}: {
  row: Row<T>;
  density: Density;
  emptyText: ReactNode;
  onCellClick?: (params: CellClickParams<T>) => void;
  rowHeight?: number;
}) {
  // explicit rowHeight: fix the cell height and drop vertical padding so the
  // density preset doesn't push rows past it (content centers via vertical-align)
  const sizing = rowHeight ? { height: rowHeight, paddingTop: 0, paddingBottom: 0 } : undefined;
  return (
    <BodyRow selected={row.getIsSelected()}>
      {row.getVisibleCells().map((cell) => {
        const meta = cell.column.columnDef.meta as DataGridColumnMeta<T> | undefined;
        const align = meta?.align;
        const value = cell.getValue();
        const isEmpty = !!cell.column.accessorFn && (value == null || value === '');
        const spec = resolveCellStyleSpec(value, meta?.cellStyle, meta?.styleRules);
        // a chip carries the css itself, otherwise it goes on the cell
        const isChip = spec?.variant === 'chip';
        const content = flexRender(cell.column.columnDef.cell, cell.getContext());
        const clickable = !!onCellClick && cell.column.id !== SELECTION_COL_ID;
        return (
          <BodyCell
            key={cell.id}
            density={density}
            align={align}
            onClick={
              clickable
                ? (event) =>
                    onCellClick!({
                      value,
                      row: row.original,
                      rowId: row.id,
                      columnId: cell.column.id,
                      cell,
                      event,
                    })
                : undefined
            }
            sx={clickable ? { cursor: 'pointer' } : undefined}
            style={{ width: cell.column.getSize(), ...sizing, ...(isChip ? undefined : spec?.css) }}
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
