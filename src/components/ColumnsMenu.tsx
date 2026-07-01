import { useState } from 'react';
import {
  Button,
  type ButtonProps,
  Checkbox,
  Divider,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
} from '@mui/material';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import type { Table } from '@tanstack/react-table';
import type { DataGridColumnMeta } from '../types';

export function ColumnsMenu<T>({
  table,
  buttonProps,
  iconOnly = false,
}: {
  table: Table<T>;
  buttonProps?: ButtonProps;
  iconOnly?: boolean;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [query, setQuery] = useState('');
  const cols = table.getAllLeafColumns().filter((c) => {
    const meta = c.columnDef.meta as DataGridColumnMeta<T> | undefined;
    return meta?.hideable !== false && c.getCanHide();
  });
  const filtered = cols.filter((c) =>
    String(c.columnDef.header ?? c.id)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  const button = (
    <Button
      size="small"
      variant="text"
      {...buttonProps}
      startIcon={iconOnly ? undefined : <ViewColumnIcon />}
      onClick={(e) => setAnchor(e.currentTarget)}
      aria-label="Columns"
      sx={iconOnly ? { minWidth: 0, px: 1, ...buttonProps?.sx } : buttonProps?.sx}
    >
      {iconOnly ? <ViewColumnIcon fontSize="small" /> : 'Columns'}
    </Button>
  );

  return (
    <>
      {iconOnly ? <Tooltip title="Columns">{button}</Tooltip> : button}
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        <MenuItem disableRipple sx={{ '&:hover': { background: 'transparent' } }}>
          <TextField
            size="small"
            placeholder="Search columns"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            fullWidth
          />
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => table.toggleAllColumnsVisible(true)}
          dense
        >
          <ListItemText>Show all</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            cols.forEach((c) => c.toggleVisibility(false));
          }}
          dense
        >
          <ListItemText>Hide all</ListItemText>
        </MenuItem>
        <Divider />
        {filtered.map((c) => (
          <MenuItem key={c.id} onClick={() => c.toggleVisibility(!c.getIsVisible())} dense>
            <Checkbox checked={c.getIsVisible()} size="small" sx={{ p: 0.5, mr: 1 }} />
            <ListItemText>{String(c.columnDef.header ?? c.id)}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
