import { useState } from 'react';
import { Button, type ButtonProps, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import DensitySmallIcon from '@mui/icons-material/DensitySmall';
import DensityMediumIcon from '@mui/icons-material/DensityMedium';
import DensityLargeIcon from '@mui/icons-material/DensityLarge';
import type { Density } from '../types';

const OPTIONS: { value: Density; label: string; icon: React.ReactNode }[] = [
  { value: 'compact', label: 'Compact', icon: <DensitySmallIcon fontSize="small" /> },
  { value: 'standard', label: 'Standard', icon: <DensityMediumIcon fontSize="small" /> },
  { value: 'comfortable', label: 'Comfortable', icon: <DensityLargeIcon fontSize="small" /> },
];

export function DensityMenu({
  density,
  onChange,
  buttonProps,
  iconOnly = false,
}: {
  density: Density;
  onChange: (d: Density) => void;
  buttonProps?: ButtonProps;
  iconOnly?: boolean;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const Current = OPTIONS.find((o) => o.value === density)!;
  const button = (
    <Button
      size="small"
      variant="text"
      {...buttonProps}
      startIcon={iconOnly ? undefined : Current.icon}
      onClick={(e) => setAnchor(e.currentTarget)}
      aria-label="Density"
      sx={iconOnly ? { minWidth: 0, px: 1, ...buttonProps?.sx } : buttonProps?.sx}
    >
      {iconOnly ? Current.icon : 'Density'}
    </Button>
  );
  return (
    <>
      {iconOnly ? <Tooltip title={`Density: ${Current.label}`}>{button}</Tooltip> : button}
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {OPTIONS.map((o) => (
          <MenuItem
            key={o.value}
            selected={o.value === density}
            onClick={() => {
              onChange(o.value);
              setAnchor(null);
            }}
            dense
          >
            <ListItemIcon>{o.icon}</ListItemIcon>
            <ListItemText>{o.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
