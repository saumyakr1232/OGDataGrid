import { PaginationFooter } from '../components/PaginationFooter';
import { FooterBar } from '../styled';
import { useDataGridContext } from './context';

export function DataGridPagination() {
  const { table, paginating, paginationOpts } = useDataGridContext();
  if (!paginating) return null;
  return (
    <FooterBar>
      <PaginationFooter
        table={table}
        pageSizeOptions={paginationOpts?.pageSizeOptions ?? [10, 25, 50, 100]}
      />
    </FooterBar>
  );
}
