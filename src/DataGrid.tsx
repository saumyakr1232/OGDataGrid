import { DataGridRoot } from './compound/Root';
import { DataGridHeader } from './compound/Header';
import { DataGridToolbar } from './compound/Toolbar';
import { DataGridTable } from './compound/Table';
import { DataGridPagination } from './compound/Pagination';
import type { DataGridProps } from './types';

function DataGridBase<T>(props: DataGridProps<T>) {
  const { toolbar, title, subtitle } = props;
  return (
    <DataGridRoot {...props}>
      {(title != null || subtitle != null) && (
        <DataGridHeader title={title} subtitle={subtitle} />
      )}
      {toolbar !== false && <DataGridToolbar />}
      <DataGridTable<T> />
      <DataGridPagination />
    </DataGridRoot>
  );
}

/**
 * Batteries-included grid. For full control over layout, compose the parts
 * yourself: <DataGrid.Root>{<DataGrid.Toolbar/>, <DataGrid.Table/>, …}</DataGrid.Root>.
 */
export const DataGrid = Object.assign(DataGridBase, {
  Root: DataGridRoot,
  Header: DataGridHeader,
  Toolbar: DataGridToolbar,
  Table: DataGridTable,
  Pagination: DataGridPagination,
});
