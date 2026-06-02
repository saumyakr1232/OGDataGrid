import type { ReactNode } from 'react';
import { Typography } from '@mui/material';
import { GridHeader } from '../styled';

export interface DataGridHeaderProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
}

export function DataGridHeader({ title, subtitle, children }: DataGridHeaderProps) {
  return (
    <GridHeader>
      {title != null && <Typography variant="h6">{title}</Typography>}
      {subtitle != null && (
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      )}
      {children}
    </GridHeader>
  );
}
