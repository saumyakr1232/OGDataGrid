import { TablePagination, type TablePaginationProps } from '@mui/material';
import type { Table } from '@tanstack/react-table';

type Props<T> = {
  table: Table<T>;
  pageSizeOptions: number[];
} & Partial<Omit<TablePaginationProps, 'count' | 'page' | 'onPageChange' | 'rowsPerPage' | 'onRowsPerPageChange' | 'rowsPerPageOptions'>>;

export function PaginationFooter<T>({ table, pageSizeOptions, ...rest }: Props<T>) {
  const { pageSize, pageIndex } = table.getState().pagination;
  return (
    <TablePagination
      component="div"
      {...rest}
      count={table.getRowCount()}
      page={pageIndex}
      onPageChange={(_, p) => table.setPageIndex(p)}
      rowsPerPage={pageSize}
      onRowsPerPageChange={(e) => table.setPageSize(Number(e.target.value))}
      rowsPerPageOptions={pageSizeOptions}
      showFirstButton
      showLastButton
    />
  );
}
