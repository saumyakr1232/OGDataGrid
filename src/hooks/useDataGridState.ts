import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { FilterFn } from '@tanstack/react-table';
import type {
  DataGridColumnDef,
  DataGridColumnMeta,
  DataGridProps,
  DataGridState,
  FilterVariant,
} from '../types';
import { dateFilterFn } from '../components/filters/DateFilter';
import { numberRangeFilterFn } from '../components/filters/NumberFilter';
import { inListFilterFn } from '../components/filters/SelectFilter';
import { inferColumnFilter, makeAccessor } from '../filters/inferFilterVariant';

const DEFAULT_PAGE_SIZE = 25;

// Fallback filterFn per variant; string values are TanStack built-ins.
const FILTER_FN_BY_VARIANT: Record<FilterVariant, FilterFn<unknown> | string> = {
  text: 'includesString',
  number: numberRangeFilterFn as unknown as FilterFn<unknown>,
  date: dateFilterFn as unknown as FilterFn<unknown>,
  select: 'equals',
  multiSelect: inListFilterFn as unknown as FilterFn<unknown>,
  boolean: 'equals',
};

const defaultState: DataGridState = {
  sorting: [],
  columnFilters: [],
  columnVisibility: {},
  rowSelection: {},
  pagination: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
  globalFilter: '',
  columnSizing: {},
  showFilters: false,
  density: 'standard',
  wrapText: false,
};

export function useDataGridState<T>(props: DataGridProps<T>) {
  const {
    rows,
    columns = [],
    getRowId,
    pagination,
    selection,
    enableMultiSort = true,
    enableColumnResizing = true,
    initialState,
    state: controlledState,
    onStateChange,
  } = props;

  const merged = useMemo<DataGridState>(
    () => ({ ...defaultState, ...initialState, ...controlledState }),
    // seed once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [sorting, setSorting] = useState(merged.sorting);
  const [columnFilters, setColumnFilters] = useState(merged.columnFilters);
  const [columnVisibility, setColumnVisibility] = useState(merged.columnVisibility);
  const [rowSelection, setRowSelection] = useState(merged.rowSelection);
  const [paginationState, setPagination] = useState(merged.pagination);
  const [globalFilter, setGlobalFilter] = useState(merged.globalFilter);
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>(merged.columnSizing);
  const [showFilters, setShowFilters] = useState(merged.showFilters);
  const [density, setDensity] = useState(merged.density);
  const [wrapText, setWrapText] = useState(merged.wrapText);

  // Keeps filter controls responsive while the O(rows) re-filter runs.
  const [, startColumnFilterTransition] = useTransition();

  // Sync controlled `state` slices into internal state on post-mount updates.
  const controlledRef = useRef(controlledState);
  useEffect(() => {
    const s = controlledState;
    if (s === controlledRef.current) return;
    controlledRef.current = s;
    if (!s) return;
    if (s.sorting !== undefined) setSorting(s.sorting);
    if (s.columnFilters !== undefined) setColumnFilters(s.columnFilters);
    if (s.columnVisibility !== undefined) setColumnVisibility(s.columnVisibility);
    if (s.rowSelection !== undefined) setRowSelection(s.rowSelection);
    if (s.pagination !== undefined) setPagination(s.pagination);
    if (s.globalFilter !== undefined) setGlobalFilter(s.globalFilter);
    if (s.columnSizing !== undefined) setColumnSizing(s.columnSizing);
    if (s.showFilters !== undefined) setShowFilters(s.showFilters);
    if (s.density !== undefined) setDensity(s.density);
    if (s.wrapText !== undefined) setWrapText(s.wrapText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlledState]);

  const fullState = useMemo<DataGridState>(
    () => ({
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: paginationState,
      globalFilter,
      columnSizing,
      showFilters,
      density,
      wrapText,
    }),
    [
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      paginationState,
      globalFilter,
      columnSizing,
      showFilters,
      density,
      wrapText,
    ],
  );

  // Ref keeps a fresh onStateChange closure from re-firing the effect.
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;
  useEffect(() => {
    onStateChangeRef.current?.(fullState);
  }, [fullState]);

  const enableSelection = !!selection;
  const enablePagination = pagination !== false;

  // DataGrid resolves any serializable config before calling this hook.
  const columnDefs = Array.isArray(columns) ? columns : [];
  const cols = useMemo(() => attachFilters(columnDefs, rows), [columnDefs, rows]);

  // Quick filter only searches visible columns, so hidden (possibly
  // sensitive) values can't be probed through the search box.
  const searchAccessors = useMemo(() => {
    const acc: ((row: T, index: number) => unknown)[] = [];
    for (const col of columnDefs) {
      const id = (col.id ?? (col as { accessorKey?: string }).accessorKey) as string | undefined;
      if (id && columnVisibility[id] === false) continue;
      const fn = makeAccessor(col);
      if (fn) acc.push(fn);
    }
    return acc;
  }, [columnDefs, columnVisibility]);

  const quickQuery = globalFilter ? globalFilter.toLowerCase().trim() : '';

  // Precomputed per-row search text; rebuilt on data/visibility changes,
  // not per keystroke, so global filtering stays a cheap `includes` scan.
  const searchBlobs = useMemo(() => {
    const map = new WeakMap<object, string>();
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r && typeof r === 'object') {
        let blob = '';
        for (const accessor of searchAccessors) {
          const v = accessor(r, i);
          if (v != null) blob += String(v).toLowerCase() + ' ';
        }
        map.set(r as object, blob);
      }
    }
    return map;
  }, [rows, searchAccessors]);

  const table = useReactTable<T>({
    data: rows,
    columns: cols as DataGridColumnDef<T>[],
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: paginationState,
      globalFilter,
      columnSizing,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: (updater) =>
      startColumnFilterTransition(() => setColumnFilters(updater)),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    onColumnSizingChange: setColumnSizing,
    getRowId: getRowId ? (row, index) => getRowId(row, index) : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    enableMultiSort,
    enableColumnResizing,
    columnResizeMode: 'onChange',
    enableRowSelection: enableSelection,
    enableMultiRowSelection: enableSelection && selection?.mode === 'multi',
    autoResetPageIndex: true,
    globalFilterFn: (row, _columnId, _filterValue) => {
      if (!quickQuery) return true;
      const blob = searchBlobs.get(row.original as object);
      return blob != null ? blob.includes(quickQuery) : false;
    },
  });

  // Notify through a ref keyed only on rowSelection: consumers typically pass
  // `selection={{ mode, onChange }}` inline (fresh reference every render), and
  // depending on that object identity re-fired the effect each render — with an
  // onChange that sets parent state, that's an infinite update loop.
  const selectionOnChangeRef = useRef(selection?.onChange);
  selectionOnChangeRef.current = selection?.onChange;
  useEffect(() => {
    if (!selectionOnChangeRef.current) return;
    const ids = Object.keys(rowSelection).filter((k) => rowSelection[k]);
    selectionOnChangeRef.current(ids);
  }, [rowSelection]);

  return {
    table,
    state: fullState,
    setters: {
      setSorting,
      setColumnFilters,
      setColumnVisibility,
      setRowSelection,
      setPagination,
      setGlobalFilter,
      setColumnSizing,
      setShowFilters,
      setDensity,
      setWrapText,
    },
  };
}

// Pick each column's filter UI and wire a matching filterFn. An explicit
// meta.filterVariant wins; otherwise we infer one from the row data.
function attachFilters<T>(columns: DataGridColumnDef<T>[], rows: T[]): DataGridColumnDef<T>[] {
  return columns.map((c) => {
    const meta = (c.meta ?? {}) as DataGridColumnMeta<T>;
    let variant = meta.filterVariant;
    let options = meta.filterOptions;

    if (!variant) {
      const inferred = inferColumnFilter(c, rows);
      if (!inferred) return c;
      variant = inferred.variant;
      if (variant === 'select' && !options) options = inferred.options;
    }

    const nextMeta: DataGridColumnMeta<T> = {
      ...meta,
      filterVariant: variant,
      ...(options ? { filterOptions: options } : {}),
    };
    const filterFn = c.filterFn ?? FILTER_FN_BY_VARIANT[variant];

    return { ...c, meta: nextMeta, filterFn } as DataGridColumnDef<T>;
  });
}


