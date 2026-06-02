import type { ReactNode } from 'react';
import type { SxProps, Theme } from '@mui/material';
import { GridRoot } from '../styled';

export interface DataGridContainerProps {
  children: ReactNode;
  height?: number | string;
  className?: string;
  sx?: SxProps<Theme>;
}

export function DataGridContainer({ children, height = 560, className, sx }: DataGridContainerProps) {
  return (
    <GridRoot className={className} sx={{ height, ...sx }}>
      {children}
    </GridRoot>
  );
}
