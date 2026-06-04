import type { TablePaginationProps } from '@mui/material';
import { PaginationFooter } from '../components/PaginationFooter';
import { FooterBar } from '../styled';
import { useDataGridContext } from './context';

type ControlledKeys =
  | 'count'
  | 'page'
  | 'onPageChange'
  | 'rowsPerPage'
  | 'onRowsPerPageChange'
  | 'rowsPerPageOptions';

export type DataGridPaginationProps = Partial<Omit<TablePaginationProps, ControlledKeys>> & {
  pageSizeOptions?: number[];
};

export function DataGridPagination({ pageSizeOptions, ...rest }: DataGridPaginationProps) {
  const { table, paginating, paginationOpts } = useDataGridContext();
  if (!paginating) return null;
  return (
    <FooterBar>
      <PaginationFooter
        table={table}
        pageSizeOptions={pageSizeOptions ?? paginationOpts?.pageSizeOptions ?? [10, 25, 50, 100]}
        {...rest}
      />
    </FooterBar>
  );
}
