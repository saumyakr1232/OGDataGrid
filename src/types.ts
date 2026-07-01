import type {
  Cell,
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  RowSelectionState,
  SortingState,
  Table,
  VisibilityState,
} from '@tanstack/react-table';
import type { MouseEvent, ReactNode } from 'react';
import type { CellStyle, DataGridConfig, StyleRule } from './columns/columnConfig';

export type Density = 'compact' | 'standard' | 'comfortable';

export type FilterVariant =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'multiSelect'
  | 'boolean';

export interface DataGridColumnMeta<T = unknown> {
  filterVariant?: FilterVariant;
  filterOptions?: { label: string; value: unknown }[];
  align?: 'left' | 'right' | 'center';
  headerTooltip?: string;
  exportValue?: (row: T) => string | number | null | undefined;
  hideable?: boolean;
  resizable?: boolean;
  cellStyle?: CellStyle;
  styleRules?: StyleRule[];
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
  columns?: boolean;
  density?: boolean;
  export?: boolean;
}

export interface DataGridState {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  columnVisibility: VisibilityState;
  rowSelection: RowSelectionState;
  pagination: PaginationState;
  globalFilter: string;
  columnSizing: Record<string, number>;
  showFilters: boolean;
  density: Density;
  /** When false (default) body cells stay on one line and truncate with an ellipsis. */
  wrapText: boolean;
}

export interface CellClickParams<T> {
  value: unknown;
  row: T;
  rowId: string;
  columnId: string;
  cell: Cell<T, unknown>;
  event: MouseEvent;
}

export interface DataGridProps<T> {
  /**
   * Column configuration. Accepts either:
   *  - `DataGridColumnDef<T>[]` — full programmatic column defs (functions ok), or
   *  - `DataGridConfig` — a JSON-serializable object describing columns, filters
   *    and sorting, suitable for storing as a string in a DB and loading
   *    back (see `resolveDataGridConfig`).
   * Optional — when omitted (or empty), columns are generated from the row data.
   */
  columns?: DataGridColumnDef<T>[] | DataGridConfig;
  rows: T[];
  getRowId?: (row: T, index: number) => string;
  loading?: boolean;
  error?: ReactNode;

  pagination?: PaginationOptions | false;
  selection?: SelectionOptions;
  enableMultiSort?: boolean;
  enableColumnResizing?: boolean;
  enableVirtualization?: boolean;

  /** Initial row density preset. Overridden by `initialState.density` if set. */
  density?: Density;
  /** Fixed body row height in px. Overrides the density-derived height. */
  rowHeight?: number;
  initialState?: Partial<DataGridState>;
  /**
   * Controlled state override. Each provided slice seeds the grid on mount and is
   * re-applied whenever this prop's reference changes, so a parent can drive state
   * after mount (e.g. apply a default filter once auth resolves). Pass a new object
   * to push an update; between updates the grid manages the slice itself. Pair with
   * `onStateChange` to keep the parent's copy in sync.
   */
  state?: Partial<DataGridState>;
  onStateChange?: (state: DataGridState) => void;

  /** Heading shown above the toolbar. */
  title?: ReactNode;
  /** Subheading shown under the title. */
  subtitle?: ReactNode;

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

  /** Fired when a data cell is clicked (not the selection or group-toggle cells). */
  onCellClick?: (params: CellClickParams<T>) => void;
}

export type DataGridTable<T> = Table<T>;
