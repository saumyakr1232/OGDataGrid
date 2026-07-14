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

/** Per-tool toolbar visibility; every tool defaults to visible. */
export interface DataGridToolbarOptions {
  quickFilter?: boolean;
  columnFilters?: boolean;
  /** Button that clears all column filters and the quick search at once. */
  resetFilters?: boolean;
  columns?: boolean;
  density?: boolean;
  export?: boolean;
  iconOnly?: boolean;
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
  /** When false (default), cells truncate with an ellipsis. */
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
   * Programmatic column defs, or a JSON-serializable `DataGridConfig`.
   * When omitted, columns are generated from the row data.
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
   * Controlled state override. Provided slices are applied on mount and
   * re-applied whenever this prop's reference changes; between updates the
   * grid manages state itself. Pair with `onStateChange` to stay in sync.
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

  /** Placeholder for empty cells. Defaults to "N/A"; pass `''` to leave blank. */
  emptyText?: ReactNode;

  enableCsvExport?: boolean;
  csvFileName?: string;

  /** Fired when a data cell (not the selection cell) is clicked. */
  onCellClick?: (params: CellClickParams<T>) => void;
}

export type DataGridTable<T> = Table<T>;
