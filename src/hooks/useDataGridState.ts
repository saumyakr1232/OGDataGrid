import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getGroupedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Row,
} from '@tanstack/react-table';
import type { FilterFn } from '@tanstack/react-table';
import type {
  AdvancedFilterGroup,
  AdvancedFilterRule,
  AggregationFn,
  DataGridColumnDef,
  DataGridColumnMeta,
  DataGridProps,
  DataGridState,
  FilterVariant,
} from '../types';
import { dateFilterFn, rowDay } from '../components/filters/DateFilter';
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
  grouping: [],
  expanded: {},
  globalFilter: '',
  advancedFilter: null,
  columnSizing: {},
  showFilters: false,
  density: 'standard',
  wrapText: false,
  aggregationOverrides: {},
};

const isDateLike = (x: unknown): boolean =>
  x instanceof Date || (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}/.test(x));

// null (not 0/NaN) for empty/non-numeric input, so a comparison against a blank
// or text cell can't be silently coerced to 0 and match `< 5` / `>= 0`.
const asNum = (x: unknown): number | null => {
  if (x == null || x === '') return null;
  const n = typeof x === 'number' ? x : Number(x);
  return Number.isNaN(n) ? null : n;
};

// Ordered comparison for gt/gte/lt/lte/between. Prefers numeric comparison; when
// both operands are dates (e.g. a Date / ISO row value vs a `yyyy-mm-dd` filter
// operand) it compares day timestamps instead — `Number('2024-01-01')` is NaN,
// so the old all-numeric path made every date rule return false. False unless
// both sides resolve to a real number or a parseable date.
function cmpValues(v: unknown, rv: unknown, cmp: (x: number, y: number) => boolean): boolean {
  const a = asNum(v);
  const b = asNum(rv);
  if (a !== null && b !== null) return cmp(a, b);
  if (isDateLike(v) && isDateLike(rv)) {
    const da = rowDay(v);
    const db = rowDay(rv);
    if (da !== null && db !== null) return cmp(da, db);
  }
  return false;
}

function evalRule<T>(rule: AdvancedFilterRule, row: Row<T>): boolean {
  const v = row.getValue(rule.columnId) as unknown;
  const rv = rule.value;
  const rv2 = rule.value2;
  const asStr = (x: unknown) => (x == null ? '' : String(x));
  const dateEquals = (): boolean | null => {
    if (isDateLike(v) && isDateLike(rv)) {
      const da = rowDay(v);
      const db = rowDay(rv);
      if (da !== null && db !== null) return da === db;
    }
    return null;
  };
  switch (rule.op) {
    case 'equals': return dateEquals() ?? v === rv;
    case 'notEquals': { const d = dateEquals(); return d === null ? v !== rv : !d; }
    case 'contains': return asStr(v).toLowerCase().includes(asStr(rv).toLowerCase());
    case 'notContains': return !asStr(v).toLowerCase().includes(asStr(rv).toLowerCase());
    case 'startsWith': return asStr(v).toLowerCase().startsWith(asStr(rv).toLowerCase());
    case 'endsWith': return asStr(v).toLowerCase().endsWith(asStr(rv).toLowerCase());
    case 'gt': return cmpValues(v, rv, (x, y) => x > y);
    case 'gte': return cmpValues(v, rv, (x, y) => x >= y);
    case 'lt': return cmpValues(v, rv, (x, y) => x < y);
    case 'lte': return cmpValues(v, rv, (x, y) => x <= y);
    case 'between':
      return cmpValues(v, rv, (x, y) => x >= y) && cmpValues(v, rv2, (x, y) => x <= y);
    case 'inList':
      return Array.isArray(rv) && (rv as unknown[]).some((x) => x === v);
    case 'isEmpty': return v == null || v === '';
    case 'isNotEmpty': return !(v == null || v === '');
    default: return true;
  }
}

function evalGroup<T>(group: AdvancedFilterGroup, row: Row<T>): boolean {
  if (group.rules.length === 0) return true;
  const results = group.rules.map((node) =>
    'combinator' in node ? evalGroup(node as AdvancedFilterGroup, row) : evalRule(node as AdvancedFilterRule, row),
  );
  return group.combinator === 'AND' ? results.every(Boolean) : results.some(Boolean);
}

export function useDataGridState<T>(props: DataGridProps<T>) {
  const {
    rows,
    columns = [],
    getRowId,
    pagination,
    selection,
    enableMultiSort = true,
    enableColumnResizing = true,
    enableGrouping = true,
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
  const [grouping, setGrouping] = useState(merged.grouping);
  const [expanded, setExpanded] = useState(merged.expanded);
  const [globalFilter, setGlobalFilter] = useState(merged.globalFilter);
  const [advancedFilter, setAdvancedFilter] = useState<AdvancedFilterGroup | null>(merged.advancedFilter);
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>(merged.columnSizing);
  const [showFilters, setShowFilters] = useState(merged.showFilters);
  const [density, setDensity] = useState(merged.density);
  const [wrapText, setWrapText] = useState(merged.wrapText);
  const [aggregationOverrides, setAggregationOverrides] = useState<Record<string, AggregationFn>>(
    merged.aggregationOverrides,
  );

  // Discrete column-filter controls (select, date, …) commit straight to
  // filter state; wrap that dispatch in a transition so the resulting O(rows)
  // re-filter is interruptible and can't freeze the control. (Text/number
  // filters additionally debounce via useDebouncedFilter on the input side.)
  const [, startColumnFilterTransition] = useTransition();

  const setAggregation = (columnId: string, fn: AggregationFn) =>
    setAggregationOverrides((prev) => ({ ...prev, [columnId]: fn }));

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
    if (s.grouping !== undefined) setGrouping(s.grouping);
    if (s.expanded !== undefined) setExpanded(s.expanded);
    if (s.globalFilter !== undefined) setGlobalFilter(s.globalFilter);
    if (s.advancedFilter !== undefined) setAdvancedFilter(s.advancedFilter);
    if (s.columnSizing !== undefined) setColumnSizing(s.columnSizing);
    if (s.showFilters !== undefined) setShowFilters(s.showFilters);
    if (s.density !== undefined) setDensity(s.density);
    if (s.wrapText !== undefined) setWrapText(s.wrapText);
    if (s.aggregationOverrides !== undefined) setAggregationOverrides(s.aggregationOverrides);
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
      grouping,
      expanded,
      globalFilter,
      advancedFilter,
      columnSizing,
      showFilters,
      density,
      wrapText,
      aggregationOverrides,
    }),
    [
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      paginationState,
      grouping,
      expanded,
      globalFilter,
      advancedFilter,
      columnSizing,
      showFilters,
      density,
      wrapText,
      aggregationOverrides,
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
  // Filter inference does a full per-column distinct scan; keep it off the
  // aggregation path so picking an aggregation in a header menu doesn't re-scan
  // the entire dataset.
  const filteredCols = useMemo(() => attachFilters(columnDefs, rows), [columnDefs, rows]);
  const cols = useMemo(
    () => attachAggregations(filteredCols, aggregationOverrides),
    [filteredCols, aggregationOverrides],
  );

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

  // TanStack only invokes globalFilterFn when its globalFilter state is
  // truthy. Since we also evaluate the advanced filter inside the same
  // function, we feed a sentinel value when an advanced filter is set but the
  // user search is empty — keeping the UX of the search box ("" stays "")
  // separate from the engine's trigger.
  const effectiveGlobalFilter =
    globalFilter && globalFilter.length > 0
      ? globalFilter
      : advancedFilter
        ? ' __adv__ '
        : '';

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

  // TanStack caches aggregated values and won't recompute them on an aggregationFn
  // change alone, so give it a fresh grouping ref to bust that memo.
  const groupingForTable = useMemo(
    () => [...grouping],
    [grouping, aggregationOverrides],
  );

  const table = useReactTable<T>({
    data: rows,
    columns: cols as DataGridColumnDef<T>[],
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: paginationState,
      grouping: groupingForTable,
      expanded,
      globalFilter: effectiveGlobalFilter,
      columnSizing,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: (updater) =>
      startColumnFilterTransition(() => setColumnFilters(updater)),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    onGroupingChange: setGrouping,
    onExpandedChange: setExpanded,
    onGlobalFilterChange: setGlobalFilter,
    onColumnSizingChange: setColumnSizing,
    getRowId: getRowId ? (row, index) => getRowId(row, index) : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getGroupedRowModel: enableGrouping ? getGroupedRowModel() : undefined,
    getExpandedRowModel: enableGrouping ? getExpandedRowModel() : undefined,
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    enableMultiSort,
    enableColumnResizing,
    columnResizeMode: 'onChange',
    enableRowSelection: enableSelection,
    enableMultiRowSelection: enableSelection && selection?.mode === 'multi',
    enableGrouping,
    autoResetPageIndex: true,
    autoResetExpanded: false,
    globalFilterFn: (row, _columnId, _filterValue) => {
      const adv = advancedFilter;
      if (adv && !evalGroup(adv, row)) return false;
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
      setGrouping,
      setExpanded,
      setGlobalFilter,
      setAdvancedFilter,
      setColumnSizing,
      setShowFilters,
      setDensity,
      setWrapText,
      setAggregationOverrides,
      setAggregation,
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

function attachAggregations<T>(
  columns: DataGridColumnDef<T>[],
  overrides: Record<string, AggregationFn>,
): DataGridColumnDef<T>[] {
  return columns.map((c) => {
    const columnId = (c.id ?? (c as { accessorKey?: string }).accessorKey) as string | undefined;
    const agg = (columnId ? overrides[columnId] : undefined) ?? c.meta?.aggregationFn;
    if (!agg) return c;
    const mapped: Record<string, string> = {
      sum: 'sum',
      avg: 'mean',
      min: 'min',
      max: 'max',
      count: 'count',
      uniqueCount: 'uniqueCount',
      unique: 'unique',
    };
    const fnName = mapped[agg] ?? 'sum';
    const next: Record<string, unknown> = { ...c, aggregationFn: fnName };
    // count-style aggregations produce a bare integer that must NOT pass through
    // the column's value formatter (e.g. a currency `cell` would render a count
    // of 12 as "$12.00"). Give them a plain aggregated renderer unless the
    // column already declares its own.
    if ((agg === 'count' || agg === 'uniqueCount') && next.aggregatedCell == null) {
      next.aggregatedCell = (info: { getValue: () => unknown }) => {
        const value = info.getValue();
        return value == null ? '' : String(value);
      };
    }
    return next as unknown as DataGridColumnDef<T>;
  });
}

