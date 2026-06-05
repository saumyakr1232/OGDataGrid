import type { ReactNode } from 'react';
import { Typography, type BoxProps, type TypographyProps } from '@mui/material';
import { GridHeader } from '../styled';

export interface DataGridHeaderProps extends Omit<BoxProps, 'title'> {
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Props forwarded to the title `Typography` (e.g. `variant`, `color`, `sx`). */
  titleProps?: TypographyProps;
  /** Props forwarded to the subtitle `Typography`. */
  subtitleProps?: TypographyProps;
}

export function DataGridHeader({
  title,
  subtitle,
  titleProps,
  subtitleProps,
  children,
  ...rest
}: DataGridHeaderProps) {
  return (
    <GridHeader {...rest}>
      {/* spread after the defaults so callers can override variant/color/sx */}
      {title != null && (
        <Typography variant="h6" {...titleProps}>
          {title}
        </Typography>
      )}
      {subtitle != null && (
        <Typography variant="body2" color="text.secondary" {...subtitleProps}>
          {subtitle}
        </Typography>
      )}
      {children}
    </GridHeader>
  );
}
