import { PaginationFooter } from '../components/PaginationFooter';
import { FooterBar } from '../styled';
import { useDataGridContext } from './context';

/**
 * Footer bound to the table's pagination state. `pageSizeOptions` is the footer's
 * own UI concern, so it can be set here; whether pagination is on at all (and the
 * initial page size) is a table-engine concern set via the `pagination` prop on
 * the root.
 */
export function DataGridPagination({ pageSizeOptions }: { pageSizeOptions?: number[] }) {
  const { table, paginating, paginationOpts } = useDataGridContext();
  if (!paginating) return null;
  return (
    <FooterBar>
      <PaginationFooter
        table={table}
        pageSizeOptions={pageSizeOptions ?? paginationOpts?.pageSizeOptions ?? [10, 25, 50, 100]}
      />
    </FooterBar>
  );
}
