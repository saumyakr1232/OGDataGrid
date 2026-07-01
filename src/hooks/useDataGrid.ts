import { createElement, useMemo } from 'react';
import { Checkbox } from '@mui/material';
import type { Row, Table } from '@tanstack/react-table';

import { useDataGridState } from './useDataGridState';
import { generateColumns } from '../columns/generateColumns';
import { isDataGridConfig, resolveDataGridConfig } from '../columns/columnConfig';
import type { DataGridColumnDef, DataGridColumnMeta, DataGridProps, DataGridState } from '../types';

export const SELECTION_COL_ID = '__select__';

export interface ResolvedTools {
  quickFilter: boolean;
  columnFilters: boolean;
  columns: boolean;
  density: boolean;
  export: boolean;
}

export interface UseDataGridResult<T> {
  table: ReturnType<typeof useDataGridState<T>>['table'];
  state: DataGridState;
  setters: ReturnType<typeof useDataGridState<T>>['setters'];
  tools: ResolvedTools;
  /** When true, toolbar tool buttons render icon-only (label in a tooltip). */
  iconOnly: boolean;
  paginating: boolean;
  paginationOpts?: { pageSize?: number; pageSizeOptions?: number[] };
  enableVirtualization: boolean;
  csvFileName: string;
}

/**
 * Headless core: resolves columns, wires state and derives the presentational
 * flags the UI needs. Use this directly to build a fully custom grid, or let
 * `<DataGrid.Provider>` provide it through context.
 */
export function useDataGrid<T>(props: DataGridProps<T>): UseDataGridResult<T> {
  const {
    columns,
    rows,
    selection,
    pagination = { mode: 'client', pageSize: 25, pageSizeOptions: [10, 25, 50, 100] },
    enableColumnResizing = true,
    enableVirtualization = true,
    enableCsvExport = true,
    csvFileName = 'export.csv',
    toolbar,
  } = props;

  const toolbarOpts = toolbar || {};
  const tools: ResolvedTools = {
    quickFilter: toolbarOpts.quickFilter ?? true,
    columnFilters: toolbarOpts.columnFilters ?? true,
    columns: toolbarOpts.columns ?? true,
    density: toolbarOpts.density ?? true,
    export: (toolbarOpts.export ?? true) && enableCsvExport,
  };
  const iconOnly = toolbarOpts.iconOnly ?? false;

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

  const paginating = pagination !== false;
  const paginationOpts = paginating
    ? (pagination as { pageSize?: number; pageSizeOptions?: number[] })
    : undefined;

  const initialState = useMemo(() => {
    const merged = { ...resolvedConfig?.initialState, ...props.initialState };
    // seed page size / density from props unless initialState already set them
    if (paginationOpts?.pageSize != null && !merged.pagination) {
      merged.pagination = { pageIndex: 0, pageSize: paginationOpts.pageSize };
    }
    if (props.density && !merged.density) merged.density = props.density;
    return merged;
  }, [resolvedConfig, props.initialState, paginationOpts?.pageSize, props.density]);

  const enrichedColumns = useMemo(() => {
    const out = [...baseColumns];
    if (selection) out.unshift(buildSelectionColumn<T>(selection.mode));
    return out;
  }, [baseColumns, selection]);

  const { table, state, setters } = useDataGridState({
    ...props,
    columns: enrichedColumns,
    initialState,
    enableColumnResizing,
  });

  return {
    table,
    state,
    setters,
    tools,
    iconOnly,
    paginating,
    paginationOpts,
    enableVirtualization,
    csvFileName,
  };
}

function buildSelectionColumn<T>(mode: 'single' | 'multi'): DataGridColumnDef<T> {
  return {
    id: SELECTION_COL_ID,
    size: 44,
    enableSorting: false,
    enableColumnFilter: false,
    enableHiding: false,
    enableResizing: false,
    meta: { hideable: false } as DataGridColumnMeta<T>,
    header: ({ table }: { table: Table<T> }) =>
      mode === 'multi'
        ? createElement(Checkbox, {
            size: 'small',
            checked: table.getIsAllRowsSelected(),
            indeterminate: table.getIsSomeRowsSelected(),
            onChange: table.getToggleAllRowsSelectedHandler(),
          })
        : null,
    cell: ({ row }: { row: Row<T> }) =>
      createElement(Checkbox, {
        size: 'small',
        checked: row.getIsSelected(),
        disabled: !row.getCanSelect(),
        onChange: row.getToggleSelectedHandler(),
        onClick: (e: React.MouseEvent) => e.stopPropagation(),
      }),
  } as unknown as DataGridColumnDef<T>;
}
