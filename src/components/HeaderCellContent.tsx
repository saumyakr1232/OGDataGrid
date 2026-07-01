import { Box, IconButton, TableSortLabel, Tooltip } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import { useState, type ReactElement } from 'react';
import { flexRender, type Header } from '@tanstack/react-table';
import type { DataGridColumnMeta } from '../types';
import { ColumnHeaderMenu } from './ColumnHeaderMenu';
import { ResizeHandle } from '../styled';

export function HeaderCellContent<T>({
  header,
}: {
  header: Header<T, unknown>;
}) {
  const col = header.column;
  const meta = col.columnDef.meta as DataGridColumnMeta<T> | undefined;
  const canSort = col.getCanSort();
  const sortDir = col.getIsSorted();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const label = flexRender(col.columnDef.header, header.getContext());

  const inner = canSort ? (
    <TableSortLabel
      active={!!sortDir}
      direction={sortDir === 'desc' ? 'desc' : 'asc'}
      onClick={col.getToggleSortingHandler()}
      hideSortIcon={false}
      sx={{ alignItems: 'center', textAlign: 'left' }}
    >
      {label}
    </TableSortLabel>
  ) : (
    <span>{label}</span>
  );

  const wrapped = meta?.headerTooltip ? (
    <Tooltip title={meta.headerTooltip}>
      <span>{inner as ReactElement}</span>
    </Tooltip>
  ) : (
    inner
  );

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'space-between', width: '100%' }}>
      <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {wrapped}
      </Box>
      {col.getIsFiltered() && (
        <Tooltip title="Filter active on this column">
          <FilterAltIcon
            color="primary"
            sx={{ fontSize: 14, flexShrink: 0 }}
            aria-label={`Filter active on ${col.id}`}
          />
        </Tooltip>
      )}
      <IconButton
        size="small"
        aria-label={`Column actions for ${col.id}`}
        onClick={(e) => setMenuAnchor(e.currentTarget)}
        sx={{ padding: 0.25 }}
      >
        <MoreVertIcon fontSize="inherit" />
      </IconButton>
      {menuAnchor && (
        <ColumnHeaderMenu
          column={col}
          anchorEl={menuAnchor}
          onClose={() => setMenuAnchor(null)}
        />
      )}
      {col.getCanResize() && (
        <ResizeHandle
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          className={col.getIsResizing() ? 'isResizing' : ''}
        />
      )}
    </Box>
  );
}
