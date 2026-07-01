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

// Default filterFn for each variant, used when a column doesn't supply its own.
// `'includesString'` and `'equals'` are TanStack built-ins referenced by name.
// Single `select` stores a scalar value (exact match); only `multiSelect` stores
// an array, which is what inListFilterFn expects.
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
    // intentionally only depend on initialState/controlledState identity
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

  // Discrete column-filter controls (select, date, …) commit straight to
  // filter state; wrap that dispatch in a transition so the resulting O(rows)
  // re-filter is interruptible and can't freeze the control. (Text/number
  // filters additionally debounce via useDebouncedFilter on the input side.)
  const [, startColumnFilterTransition] = useTransition();

  // Controlled `state`: apply each provided slice to internal state whenever the
  // prop reference changes after mount (the initial value is already seeded via
  // `merged`). Without this the grid ignored post-mount `state` updates entirely
  // — e.g. a parent applying a row-restricting filter once auth resolves saw
  // nothing happen. Between parent updates the grid stays interactive.
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
    // setState fns are stable; we intentionally key only on the prop reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlledState]);

  // Memoized over its individual slices (all immutable setState values, so
  // reference equality is exact) — its identity changes only when state really
  // changes. This avoids the previous per-render `JSON.stringify` diff, which
  // also dropped Date values from filter state and ran on every resize frame.
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

  // Emit through a ref so a fresh `onStateChange` closure doesn't re-fire when
  // state is unchanged; the effect runs only when `fullState` identity changes.
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;
  useEffect(() => {
    onStateChangeRef.current?.(fullState);
  }, [fullState]);

  const enableSelection = !!selection;
  const enablePagination = pagination !== false;

  // `columns` is always a resolved def array here — DataGrid converts a
  // serializable DataGridConfig before calling this hook.
  const columnDefs = Array.isArray(columns) ? columns : [];
  const cols = useMemo(() => attachFilters(columnDefs, rows), [columnDefs, rows]);

  // Accessors for the columns the quick filter is allowed to search: visible and
  // data-bearing. Restricting to visible columns stops a hidden column (e.g. a
  // sensitive value the user can't see) from being oracled one substring at a
  // time through the search box.
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

  // Lowercase the query once per render instead of once per row.
  const quickQuery = globalFilter ? globalFilter.toLowerCase().trim() : '';

  // Precompute a lowercased search blob per row from the searchable columns,
  // rebuilt only when `rows` or column visibility changes — not on every
  // keystroke. This turns the per-keystroke global filter from O(rows × cells)
  // of cell/string work into an O(rows) `includes` scan, which keeps the search
  // input from janking on large datasets. Columns with a custom
  // accessorFn/formatted cell are matched on their underlying data.
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

  useEffect(() => {
    if (!selection?.onChange) return;
    const ids = Object.keys(rowSelection).filter((k) => rowSelection[k]);
    selection.onChange(ids);
  }, [rowSelection, selection]);

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

/**
 * Decide which filter UI each column should use and wire a matching `filterFn`.
 *
 * A consumer-supplied `meta.filterVariant` always wins; when it's absent we infer
 * the variant from a *random* sample of the row data (see inferColumnFilter —
 * random rather than head-sampled, so data that already arrives sorted from an
 * endpoint doesn't bias the guess). For an inferred `select` we also derive the
 * option list when the consumer hasn't supplied one. Any column that already
 * declares its own `filterFn` keeps it.
 */
function attachFilters<T>(columns: DataGridColumnDef<T>[], rows: T[]): DataGridColumnDef<T>[] {
  return columns.map((c) => {
    const meta = (c.meta ?? {}) as DataGridColumnMeta<T>;
    let variant = meta.filterVariant;
    let options = meta.filterOptions;

    if (!variant) {
      const inferred = inferColumnFilter(c, rows);
      if (!inferred) return c; // display/action column, or no data to learn from
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


