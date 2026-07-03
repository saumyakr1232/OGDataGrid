import { Children, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Box } from '@mui/material';
import { GridToolbar } from '../styled';
import { DataGridOverflowMenu } from './toolbar-parts';

// Must match GridToolbar's theme.spacing(1) gap so measured widths line up.
const GAP_PX = 8;
// Room reserved for the 3-dot trigger when anything overflows.
const OVERFLOW_RESERVE_PX = 48;

export interface DataGridResponsiveToolbarProps {
  /** Collapsible controls in priority order — the last ones overflow first. */
  children?: ReactNode;
  /** Pinned content rendered before the collapsible group. */
  prefix?: ReactNode;
  overflowTooltip?: string;
}

/**
 * Moves trailing children into a 3-dot overflow menu when they don't fit,
 * and brings them back when there's room again.
 */
export function DataGridResponsiveToolbar({
  children,
  prefix,
  overflowTooltip,
}: DataGridResponsiveToolbarProps) {
  const items = Children.toArray(children);
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(items.length);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measureLayer = measureRef.current;
    if (!container || !measureLayer) return;

    const measure = () => {
      // The hidden layer renders every item, so collapsed ones can still be
      // measured and brought back when the container grows.
      const widths = [...measureLayer.children].map(
        (el) => (el as HTMLElement).getBoundingClientRect().width,
      );
      const available = container.clientWidth;
      let used = 0;
      let count = 0;
      for (let i = 0; i < widths.length; i++) {
        const next = used + widths[i] + (i > 0 ? GAP_PX : 0);
        const moreAfter = i < widths.length - 1;
        if (next + (moreAfter ? OVERFLOW_RESERVE_PX : 0) <= available) {
          used = next;
          count = i + 1;
        } else {
          break;
        }
      }
      setVisibleCount(count);
    };

    const ro = new ResizeObserver(measure);
    ro.observe(container);
    measure();
    return () => ro.disconnect();
  }, [items.length]);

  const visible = items.slice(0, visibleCount);
  const overflow = items.slice(visibleCount);

  return (
    <GridToolbar sx={{ position: 'relative' }}>
      {prefix}
      <Box
        ref={containerRef}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 1,
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        {visible}
        {overflow.length > 0 && (
          <DataGridOverflowMenu tooltip={overflowTooltip}>{overflow}</DataGridOverflowMenu>
        )}
      </Box>
      {/* Off-screen measurement layer */}
      <Box
        ref={measureRef}
        aria-hidden
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          display: 'flex',
          gap: 1,
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {items.map((item, i) => (
          <Box key={i} sx={{ flex: '0 0 auto', display: 'inline-flex' }}>
            {item}
          </Box>
        ))}
      </Box>
    </GridToolbar>
  );
}
