import { Box, type BoxProps } from '@mui/material';
import { GridToolbar } from '../styled';
import { useDataGridContext } from './context';
import {
  DataGridAdvancedFilter,
  DataGridColumnsButton,
  DataGridDensityButton,
  DataGridExportButton,
  DataGridFilterToggle,
  DataGridGroupByButton,
  DataGridQuickFilter,
} from './toolbar-parts';

/**
 * Toolbar layout container. With no children it renders the default set of
 * tools (honouring the `toolbar` prop flags); pass children to compose your own.
 */
export function DataGridToolbar({ children, ...rest }: BoxProps) {
  const { tools, slots } = useDataGridContext();

  if (children) return <GridToolbar {...rest}>{children}</GridToolbar>;

  return (
    <GridToolbar {...rest}>
      {tools.quickFilter && <DataGridQuickFilter />}
      {tools.columnFilters && <DataGridFilterToggle />}
      {tools.advancedFilter && <DataGridAdvancedFilter />}
      {tools.columns && <DataGridColumnsButton />}
      {tools.groupBy && <DataGridGroupByButton />}
      {tools.density && <DataGridDensityButton />}
      {tools.export && <DataGridExportButton />}
      <Box sx={{ flex: 1 }} />
      {slots?.toolbarExtras}
    </GridToolbar>
  );
}
