import type { ReactNode } from 'react';
import { Typography, type BoxProps } from '@mui/material';
import { GridHeader } from '../styled';

export interface DataGridHeaderProps extends Omit<BoxProps, 'title'> {
  title?: ReactNode;
  subtitle?: ReactNode;
}

export function DataGridHeader({ title, subtitle, children, ...rest }: DataGridHeaderProps) {
  return (
    <GridHeader {...rest}>
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
