import { useEffect, useMemo, useRef, useState } from 'react';
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
import { dateFilterFn } from '../components/filters/DateFilter';
import { numberRangeFilterFn } from '../components/filters/NumberFilter';
import { inListFilterFn } from '../components/filters/SelectFilter';
import { inferColumnFilter } from '../filters/inferFilterVariant';

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
  aggregationOverrides: {},
};

function evalRule<T>(rule: AdvancedFilterRule, row: Row<T>): boolean {
  const v = row.getValue(rule.columnId) as unknown;
  const rv = rule.value;
  const rv2 = rule.value2;
  const asNum = (x: unknown) => (typeof x === 'number' ? x : Number(x));
  const asStr = (x: unknown) => (x == null ? '' : String(x));
  switch (rule.op) {
    case 'equals': return v === rv;
    case 'notEquals': return v !== rv;
    case 'contains': return asStr(v).toLowerCase().includes(asStr(rv).toLowerCase());
    case 'notContains': return !asStr(v).toLowerCase().includes(asStr(rv).toLowerCase());
    case 'startsWith': return asStr(v).toLowerCase().startsWith(asStr(rv).toLowerCase());
    case 'endsWith': return asStr(v).toLowerCase().endsWith(asStr(rv).toLowerCase());
    case 'gt': return asNum(v) > asNum(rv);
    case 'gte': return asNum(v) >= asNum(rv);
    case 'lt': return asNum(v) < asNum(rv);
    case 'lte': return asNum(v) <= asNum(rv);
    case 'between': return asNum(v) >= asNum(rv) && asNum(v) <= asNum(rv2);
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
  const [aggregationOverrides, setAggregationOverrides] = useState<Record<string, AggregationFn>>(
    merged.aggregationOverrides,
  );

  const setAggregation = (columnId: string, fn: AggregationFn) =>
    setAggregationOverrides((prev) => ({ ...prev, [columnId]: fn }));

  const fullState: DataGridState = {
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
    aggregationOverrides,
  };

  const lastEmittedRef = useRef<string>('');
  useEffect(() => {
    if (!onStateChange) return;
    const key = JSON.stringify(fullState);
    if (key !== lastEmittedRef.current) {
      lastEmittedRef.current = key;
      onStateChange(fullState);
    }
  });

  const enableSelection = !!selection;
  const enablePagination = pagination !== false;

  const cols = useMemo(
    () => attachAggregations(attachFilters(columns, rows), aggregationOverrides),
    [columns, rows, aggregationOverrides],
  );

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

  const table = useReactTable<T>({
    data: rows,
    columns: cols as DataGridColumnDef<T>[],
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: paginationState,
      grouping,
      expanded,
      globalFilter: effectiveGlobalFilter,
      columnSizing,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
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
    globalFilterFn: (row, _columnId, _filterValue) => {
      const adv = advancedFilter;
      if (adv && !evalGroup(adv, row)) return false;
      const q = String(globalFilter || '').toLowerCase().trim();
      if (!q) return true;
      return row.getAllCells().some((c) => {
        const v = c.getValue();
        return v != null && String(v).toLowerCase().includes(q);
      });
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
    return { ...c, aggregationFn: fnName } as DataGridColumnDef<T>;
  });
}

