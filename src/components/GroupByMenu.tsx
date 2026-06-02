import { useState } from 'react';
import { Button, Checkbox, ListItemText, Menu, MenuItem, Divider } from '@mui/material';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import type { Table } from '@tanstack/react-table';
import type { DataGridColumnMeta } from '../types';

export function GroupByMenu<T>({ table }: { table: Table<T> }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const cols = table.getAllLeafColumns().filter((c) => {
    const meta = c.columnDef.meta as DataGridColumnMeta<T> | undefined;
    return meta?.groupable && c.getCanGroup();
  });
  const grouping = table.getState().grouping;

  return (
    <>
      <Button
        size="small"
        startIcon={<GroupWorkIcon />}
        onClick={(e) => setAnchor(e.currentTarget)}
        variant="text"
      >
        Group by
        {grouping.length > 0 ? ` (${grouping.length})` : ''}
      </Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {cols.length === 0 && (
          <MenuItem disabled dense>
            <ListItemText>No groupable columns</ListItemText>
          </MenuItem>
        )}
        {cols.map((c) => {
          const grouped = c.getIsGrouped();
          return (
            <MenuItem key={c.id} onClick={() => c.toggleGrouping()} dense>
              <Checkbox checked={grouped} size="small" sx={{ p: 0.5, mr: 1 }} />
              <ListItemText>{String(c.columnDef.header ?? c.id)}</ListItemText>
            </MenuItem>
          );
        })}
        {/* array, not a fragment — Menu can't iterate a fragment child */}
        {grouping.length > 0 && [
          <Divider key="divider" />,
          <MenuItem key="clear" onClick={() => table.resetGrouping(true)} dense>
            <ListItemText>Clear groups</ListItemText>
          </MenuItem>,
          <MenuItem key="expand-all" onClick={() => table.toggleAllRowsExpanded(true)} dense>
            <ListItemText>Expand all</ListItemText>
          </MenuItem>,
          <MenuItem key="collapse-all" onClick={() => table.toggleAllRowsExpanded(false)} dense>
            <ListItemText>Collapse all</ListItemText>
          </MenuItem>,
        ]}
      </Menu>
    </>
  );
}
