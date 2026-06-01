import type {
  ColumnDef,
  ColumnFiltersState,
  GroupingState,
  PaginationState,
  RowSelectionState,
  SortingState,
  Table,
  VisibilityState,
  ExpandedState,
} from '@tanstack/react-table';
import type { ReactNode } from 'react';

export type Density = 'compact' | 'standard' | 'comfortable';

export type FilterVariant =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'multiSelect'
  | 'boolean';

export type AggregationFn =
  | 'sum'
  | 'avg'
  | 'min'
  | 'max'
  | 'count'
  | 'uniqueCount'
  | 'unique';

export interface DataGridColumnMeta<T = unknown> {
  filterVariant?: FilterVariant;
  filterOptions?: { label: string; value: unknown }[];
  align?: 'left' | 'right' | 'center';
  headerTooltip?: string;
  exportValue?: (row: T) => string | number | null | undefined;
  hideable?: boolean;
  resizable?: boolean;
  groupable?: boolean;
  aggregationFn?: AggregationFn;
  aggregatedCell?: (info: { value: unknown; rowCount: number }) => ReactNode;
}

export type DataGridColumnDef<T> = ColumnDef<T, unknown> & {
  meta?: DataGridColumnMeta<T>;
};

export interface PaginationOptions {
  mode?: 'client';
  pageSize?: number;
  pageSizeOptions?: number[];
}

export interface SelectionOptions {
  mode: 'single' | 'multi';
  onChange?: (selectedRowIds: string[]) => void;
}

export interface DataGridSlots {
  loadingOverlay?: ReactNode;
  noRowsOverlay?: ReactNode;
  errorOverlay?: ReactNode;
  toolbarExtras?: ReactNode;
}

/**
 * Per-tool visibility for the toolbar. Every tool defaults to visible; set a
 * key to `false` to hide it. Pass `toolbar={false}` on DataGrid to drop the
 * toolbar entirely.
 */
export interface DataGridToolbarOptions {
  quickFilter?: boolean;
  columnFilters?: boolean;
  advancedFilter?: boolean;
  columns?: boolean;
  groupBy?: boolean;
  density?: boolean;
  export?: boolean;
}

export interface AdvancedFilterRule {
  id: string;
  columnId: string;
  op:
    | 'equals'
    | 'notEquals'
    | 'contains'
    | 'notContains'
    | 'startsWith'
    | 'endsWith'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'between'
    | 'inList'
    | 'isEmpty'
    | 'isNotEmpty';
  value?: unknown;
  value2?: unknown;
}

export interface AdvancedFilterGroup {
  id: string;
  combinator: 'AND' | 'OR';
  rules: (AdvancedFilterRule | AdvancedFilterGroup)[];
}

export interface DataGridState {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  columnVisibility: VisibilityState;
  rowSelection: RowSelectionState;
  pagination: PaginationState;
  grouping: GroupingState;
  expanded: ExpandedState;
  globalFilter: string;
  advancedFilter: AdvancedFilterGroup | null;
  columnSizing: Record<string, number>;
  showFilters: boolean;
  density: Density;
  aggregationOverrides: Record<string, AggregationFn>;
}

export interface DataGridProps<T> {
  /**
   * Column definitions. Optional — when omitted (or empty), columns are
   * generated from the row data, one per top-level key.
   */
  columns?: DataGridColumnDef<T>[];
  rows: T[];
  getRowId?: (row: T, index: number) => string;
  loading?: boolean;
  error?: ReactNode;

  pagination?: PaginationOptions | false;
  selection?: SelectionOptions;
  enableMultiSort?: boolean;
  enableColumnResizing?: boolean;
  enableGrouping?: boolean;
  enableVirtualization?: boolean;

  density?: Density;
  initialState?: Partial<DataGridState>;
  state?: Partial<DataGridState>;
  onStateChange?: (state: DataGridState) => void;

  slots?: DataGridSlots;
  toolbar?: DataGridToolbarOptions | false;
  height?: number | string;
  className?: string;

  /**
   * Placeholder rendered for any cell whose value is null/undefined/empty.
   * Defaults to "N/A". Pass `''` to keep empty cells blank.
   */
  emptyText?: ReactNode;

  enableCsvExport?: boolean;
  csvFileName?: string;
}

export type DataGridTable<T> = Table<T>;
