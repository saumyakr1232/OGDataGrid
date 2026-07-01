import { Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import SortIcon from '@mui/icons-material/Sort';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import type { Column } from '@tanstack/react-table';
import type { DataGridColumnMeta } from '../types';

export function ColumnHeaderMenu<T>({
  column,
  anchorEl,
  onClose,
}: {
  column: Column<T, unknown>;
  anchorEl: HTMLElement;
  onClose: () => void;
}) {
  const meta = column.columnDef.meta as DataGridColumnMeta<T> | undefined;
  const canHide = (meta?.hideable ?? true) && column.getCanHide();

  return (
    <Menu anchorEl={anchorEl} open onClose={onClose}>
      {column.getCanSort() && (
        <MenuItem
          onClick={() => {
            column.toggleSorting(false);
            onClose();
          }}
        >
          <ListItemIcon><SortIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Sort ascending</ListItemText>
        </MenuItem>
      )}
      {column.getCanSort() && (
        <MenuItem
          onClick={() => {
            column.toggleSorting(true);
            onClose();
          }}
        >
          <ListItemIcon><SortIcon fontSize="small" sx={{ transform: 'scaleY(-1)' }} /></ListItemIcon>
          <ListItemText>Sort descending</ListItemText>
        </MenuItem>
      )}
      {column.getCanSort() && column.getIsSorted() && (
        <MenuItem
          onClick={() => {
            column.clearSorting();
            onClose();
          }}
        >
          <ListItemText inset>Clear sort</ListItemText>
        </MenuItem>
      )}
      {canHide && <Divider />}
      {canHide && (
        <MenuItem
          onClick={() => {
            column.toggleVisibility(false);
            onClose();
          }}
        >
          <ListItemIcon><VisibilityOffIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Hide column</ListItemText>
        </MenuItem>
      )}
    </Menu>
  );
}
