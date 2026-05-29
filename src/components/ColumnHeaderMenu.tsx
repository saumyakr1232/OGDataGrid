import { Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import SortIcon from '@mui/icons-material/Sort';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import FunctionsIcon from '@mui/icons-material/Functions';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import type { Column } from '@tanstack/react-table';
import type { AggregationFn, DataGridColumnMeta } from '../types';
import { useState } from 'react';

const AGG_OPTIONS: AggregationFn[] = ['sum', 'avg', 'min', 'max', 'count', 'uniqueCount'];

export function ColumnHeaderMenu<T>({
  column,
  anchorEl,
  onClose,
  groupingActive,
  currentAggregation,
  onSetAggregation,
}: {
  column: Column<T, unknown>;
  anchorEl: HTMLElement;
  onClose: () => void;
  groupingActive: boolean;
  currentAggregation: AggregationFn | undefined;
  onSetAggregation: (fn: AggregationFn) => void;
}) {
  const meta = column.columnDef.meta as DataGridColumnMeta<T> | undefined;
  const canHide = (meta?.hideable ?? true) && column.getCanHide();
  const canGroup = (meta?.groupable ?? false) && column.getCanGroup();
  // Aggregation only manifests in grouped/aggregated rows, so only offer it
  // while a grouping is active and the column opted in via meta.aggregationFn.
  const canAggregate = groupingActive && meta?.aggregationFn !== undefined;
  const [aggMenu, setAggMenu] = useState<HTMLElement | null>(null);

  return (
    <>
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
        {canGroup && <Divider />}
        {canGroup && (
          <MenuItem
            onClick={() => {
              column.toggleGrouping();
              onClose();
            }}
          >
            <ListItemIcon><GroupWorkIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{column.getIsGrouped() ? 'Ungroup' : 'Group by this column'}</ListItemText>
          </MenuItem>
        )}
        {canAggregate && (
          <MenuItem
            onClick={(e) => setAggMenu(e.currentTarget)}
          >
            <ListItemIcon><FunctionsIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Aggregation: {currentAggregation ?? meta?.aggregationFn ?? 'none'}</ListItemText>
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
      {aggMenu && (
        <Menu anchorEl={aggMenu} open onClose={() => setAggMenu(null)}>
          {AGG_OPTIONS.map((opt) => (
            <MenuItem
              key={opt}
              selected={(currentAggregation ?? meta?.aggregationFn) === opt}
              onClick={() => {
                onSetAggregation(opt);
                setAggMenu(null);
                onClose();
              }}
            >
              {opt}
            </MenuItem>
          ))}
        </Menu>
      )}
    </>
  );
}
