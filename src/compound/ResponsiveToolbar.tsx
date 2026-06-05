import { Children, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Box } from '@mui/material';
import { GridToolbar } from '../styled';
import { DataGridOverflowMenu } from './toolbar-parts';

// GridToolbar uses theme.spacing(1) = 8px between items; mirror it here so the
// measured widths line up with what actually renders.
const GAP_PX = 8;
// Space reserved for the 3-dot trigger (button + gap) when anything overflows.
const OVERFLOW_RESERVE_PX = 48;

export interface DataGridResponsiveToolbarProps {
  /** Collapsible controls, in priority order — the *last* ones overflow first. */
  children?: ReactNode;
  /** Pinned content rendered before the collapsible group (e.g. the search box). */
  prefix?: ReactNode;
  overflowTooltip?: string;
}

/**
 * A toolbar that automatically moves its trailing children into a 3-dot
 * overflow menu when they don't fit the available width (a "priority+" layout),
 * and brings them back out when there's room again. Order children high→low
 * priority; low-priority ones collapse first.
 *
 * For unconditional grouping regardless of width, use `DataGrid.OverflowMenu`
 * directly instead.
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
      // The hidden layer always renders every item, so widths stay available
      // even for currently-collapsed ones (needed to expand again on grow).
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
    // Re-run when the set of items changes (count is a cheap proxy).
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
      {/* Off-screen measurement layer: never interactive, just sized. */}
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
