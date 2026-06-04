import { useState } from 'react';
import { Button, type ButtonProps, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
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
}: {
  density: Density;
  onChange: (d: Density) => void;
  buttonProps?: ButtonProps;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const Current = OPTIONS.find((o) => o.value === density)!;
  return (
    <>
      <Button
        size="small"
        variant="text"
        {...buttonProps}
        startIcon={Current.icon}
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        Density
      </Button>
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
