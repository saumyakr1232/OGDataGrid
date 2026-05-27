import { styled } from '@mui/material/styles';
import { Box, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import type { Density } from './types';

export const densityToRowHeight: Record<Density, number> = {
  compact: 32,
  standard: 44,
  comfortable: 56,
};

export const densityToCellPadding: Record<Density, string> = {
  compact: '4px 8px',
  standard: '8px 12px',
  comfortable: '12px 16px',
};

export const GridRoot = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 320,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  background: theme.palette.background.paper,
  overflow: 'hidden',
  fontFamily: theme.typography.fontFamily,
}));

export const GridToolbar = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1, 1.5),
  borderBottom: `1px solid ${theme.palette.divider}`,
  flexWrap: 'wrap',
}));

export const GridTableContainer = styled(TableContainer)({
  flex: 1,
  overflow: 'auto',
  position: 'relative',
});

export const StickyHead = styled(TableHead)(({ theme }) => ({
  position: 'sticky',
  top: 0,
  zIndex: 2,
  background: theme.palette.background.paper,
  '& .MuiTableCell-head': {
    background: theme.palette.mode === 'light' ? theme.palette.grey[50] : theme.palette.grey[900],
    fontWeight: 600,
    borderBottom: `1px solid ${theme.palette.divider}`,
    whiteSpace: 'nowrap',
  },
}));

export const HeaderCell = styled(TableCell, {
  shouldForwardProp: (p) => p !== 'density' && p !== 'resizable',
})<{ density: Density; resizable?: boolean }>(({ density }) => ({
  padding: densityToCellPadding[density],
  position: 'relative',
  userSelect: 'none',
}));

export const BodyCell = styled(TableCell, {
  shouldForwardProp: (p) =>
    p !== 'density' && p !== 'align' && p !== 'isActive' && p !== 'isInRange',
})<{
  density: Density;
  align?: 'left' | 'right' | 'center';
  isActive?: boolean;
  isInRange?: boolean;
}>(({ theme, density, align, isActive, isInRange }) => ({
  padding: densityToCellPadding[density],
  textAlign: align ?? 'left',
  borderBottom: '1px solid',
  borderColor: 'rgba(0,0,0,0.06)',
  position: 'relative',
  backgroundColor: isInRange ? theme.palette.action.selected : undefined,
  boxShadow: isActive ? `inset 0 0 0 2px ${theme.palette.primary.main}` : undefined,
  cursor: 'cell',
}));

export const BodyRow = styled(TableRow, {
  shouldForwardProp: (p) => p !== 'selected' && p !== 'aggregated',
})<{ selected?: boolean; aggregated?: boolean }>(({ theme, selected, aggregated }) => ({
  backgroundColor: aggregated
    ? theme.palette.action.hover
    : selected
      ? theme.palette.action.selected
      : 'transparent',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  cursor: 'default',
}));

export const ResizeHandle = styled('span')(({ theme }) => ({
  position: 'absolute',
  right: 0,
  top: 0,
  height: '100%',
  width: 6,
  cursor: 'col-resize',
  userSelect: 'none',
  touchAction: 'none',
  background: 'transparent',
  '&:hover, &.isResizing': {
    background: theme.palette.primary.main,
    opacity: 0.4,
  },
}));

export const OverlayBox = styled(Box)(({ theme }) => ({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: theme.palette.background.paper,
  opacity: 0.85,
  zIndex: 3,
}));

export const FooterBar = styled(Box)(({ theme }) => ({
  borderTop: `1px solid ${theme.palette.divider}`,
}));

export const GroupCellInner = styled(Box)({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
});
