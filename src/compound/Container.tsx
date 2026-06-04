import type { BoxProps } from '@mui/material';
import { GridRoot } from '../styled';

export interface DataGridContainerProps extends BoxProps {
  height?: number | string;
}

export function DataGridContainer({ children, height = 560, sx, ...rest }: DataGridContainerProps) {
  return (
    <GridRoot {...rest} sx={{ height, ...sx }}>
      {children}
    </GridRoot>
  );
}
