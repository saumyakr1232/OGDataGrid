import {
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import InsertChartIcon from '@mui/icons-material/InsertChart';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

export interface CellContextMenuAnchor {
  x: number;
  y: number;
}

export function CellContextMenu({
  anchor,
  onClose,
  onChartRange,
  onCopy,
  onCopyWithHeaders,
  hasRange,
}: {
  anchor: CellContextMenuAnchor | null;
  onClose: () => void;
  onChartRange: () => void;
  onCopy: () => void;
  onCopyWithHeaders: () => void;
  hasRange: boolean;
}) {
  return (
    <Menu
      open={!!anchor}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={anchor ? { top: anchor.y, left: anchor.x } : undefined}
      MenuListProps={{ dense: true }}
    >
      <MenuItem
        disabled={!hasRange}
        onClick={() => {
          onChartRange();
          onClose();
        }}
      >
        <ListItemIcon><InsertChartIcon fontSize="small" /></ListItemIcon>
        <ListItemText>Chart range</ListItemText>
      </MenuItem>
      <Divider />
      <MenuItem
        disabled={!hasRange}
        onClick={() => {
          onCopy();
          onClose();
        }}
      >
        <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
        <ListItemText>Copy</ListItemText>
      </MenuItem>
      <MenuItem
        disabled={!hasRange}
        onClick={() => {
          onCopyWithHeaders();
          onClose();
        }}
      >
        <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
        <ListItemText>Copy with headers</ListItemText>
      </MenuItem>
    </Menu>
  );
}
