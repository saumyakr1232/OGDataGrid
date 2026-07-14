import type { ReactElement } from 'react';
import { DataGridProvider } from './compound/Provider';
import { DataGridContainer } from './compound/Container';
import { DataGridHeader } from './compound/Header';
import { DataGridToolbar } from './compound/Toolbar';
import { DataGridResponsiveToolbar } from './compound/ResponsiveToolbar';
import { DataGridTable } from './compound/Table';
import { DataGridPagination } from './compound/Pagination';
import {
  DataGridColumnsButton,
  DataGridDensityButton,
  DataGridExportButton,
  DataGridFilterToggle,
  DataGridOverflowMenu,
  DataGridQuickFilter,
  DataGridWrapToggle,
} from './compound/toolbar-parts';
import type { DataGridProps } from './types';

/** Props for the all-in-one `<DataGrid />`. Everything in `DataGridProps`, plus `meta`. */
export type DataGridComponentProps<T> = DataGridProps<T> & {
  /** Arbitrary consumer data, readable in custom toolbar parts via `useDataGridMeta`. */
  meta?: unknown;
  /** For custom layouts, compose with `DataGrid.Provider` + parts instead of children. */
  children?: never;
};

/**
 * All-in-one layout: Provider → Container → [Header] → [Toolbar] → Table →
 * Pagination. `title`/`subtitle` render a header only when set; `toolbar={false}`
 * drops the toolbar entirely (the gate must live here — `useDataGrid` resolves
 * `false` and "unset" to the same per-tool flags). Pagination hides itself when
 * `pagination={false}`.
 */
function DataGridRoot<T>({ meta, ...props }: DataGridComponentProps<T>): ReactElement {
  const { title, subtitle, height, toolbar, className } = props;
  return (
    <DataGridProvider<T> {...props} meta={meta}>
      <DataGridContainer height={height} className={className}>
        {(title != null || subtitle != null) && <DataGridHeader title={title} subtitle={subtitle} />}
        {toolbar !== false && <DataGridToolbar />}
        <DataGridTable<T> />
        <DataGridPagination />
      </DataGridContainer>
    </DataGridProvider>
  );
}

/**
 * The `<DataGrid />` component with the composable parts attached as statics:
 * render it directly for the standard layout, or build a custom one from
 * `DataGrid.Provider`, `DataGrid.Container`, and the parts you need.
 */
export interface DataGridComponent {
  <T>(props: DataGridComponentProps<T>): ReactElement;
  readonly Provider: typeof DataGridProvider;
  readonly Container: typeof DataGridContainer;
  readonly Header: typeof DataGridHeader;
  readonly Toolbar: typeof DataGridToolbar;
  readonly ResponsiveToolbar: typeof DataGridResponsiveToolbar;
  readonly Table: typeof DataGridTable;
  readonly Pagination: typeof DataGridPagination;
  readonly QuickFilter: typeof DataGridQuickFilter;
  readonly FilterToggle: typeof DataGridFilterToggle;
  readonly ColumnsButton: typeof DataGridColumnsButton;
  readonly DensityButton: typeof DataGridDensityButton;
  readonly WrapToggle: typeof DataGridWrapToggle;
  readonly ExportButton: typeof DataGridExportButton;
  readonly OverflowMenu: typeof DataGridOverflowMenu;
}

export const DataGrid: DataGridComponent = Object.assign(DataGridRoot, {
  Provider: DataGridProvider,
  Container: DataGridContainer,
  Header: DataGridHeader,
  Toolbar: DataGridToolbar,
  ResponsiveToolbar: DataGridResponsiveToolbar,
  Table: DataGridTable,
  Pagination: DataGridPagination,
  QuickFilter: DataGridQuickFilter,
  FilterToggle: DataGridFilterToggle,
  ColumnsButton: DataGridColumnsButton,
  DensityButton: DataGridDensityButton,
  WrapToggle: DataGridWrapToggle,
  ExportButton: DataGridExportButton,
  OverflowMenu: DataGridOverflowMenu,
} as const);
