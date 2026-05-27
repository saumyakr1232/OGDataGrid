import { TablePagination } from '@mui/material';
import type { Table } from '@tanstack/react-table';

export function PaginationFooter<T>({
  table,
  pageSizeOptions,
}: {
  table: Table<T>;
  pageSizeOptions: number[];
}) {
  const { pageSize, pageIndex } = table.getState().pagination;
  const total = table.getFilteredRowModel().rows.length;
  return (
    <TablePagination
      component="div"
      count={total}
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
