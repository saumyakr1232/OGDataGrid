import { DataGridProvider } from './compound/Provider';
import { DataGridContainer } from './compound/Container';
import { DataGridHeader } from './compound/Header';
import { DataGridToolbar } from './compound/Toolbar';
import { DataGridResponsiveToolbar } from './compound/ResponsiveToolbar';
import { DataGridTable } from './compound/Table';
import { DataGridPagination } from './compound/Pagination';
import {
  DataGridAdvancedFilter,
  DataGridColumnsButton,
  DataGridDensityButton,
  DataGridExportButton,
  DataGridFilterToggle,
  DataGridGroupByButton,
  DataGridOverflowMenu,
  DataGridQuickFilter,
  DataGridWrapToggle,
} from './compound/toolbar-parts';

/**
 * Composable grid. Wrap data in `DataGrid.Provider`, draw the shell with
 * `DataGrid.Container`, and assemble the parts you need.
 */
export const DataGrid = {
  Provider: DataGridProvider,
  Container: DataGridContainer,
  Header: DataGridHeader,
  Toolbar: DataGridToolbar,
  ResponsiveToolbar: DataGridResponsiveToolbar,
  Table: DataGridTable,
  Pagination: DataGridPagination,
  QuickFilter: DataGridQuickFilter,
  FilterToggle: DataGridFilterToggle,
  AdvancedFilter: DataGridAdvancedFilter,
  ColumnsButton: DataGridColumnsButton,
  GroupByButton: DataGridGroupByButton,
  DensityButton: DataGridDensityButton,
  WrapToggle: DataGridWrapToggle,
  ExportButton: DataGridExportButton,
  OverflowMenu: DataGridOverflowMenu,
};
