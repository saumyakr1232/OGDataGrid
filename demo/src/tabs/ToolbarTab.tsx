import { useState } from 'react';
import { Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { DataGrid } from 'og-data-grid';
import { getSales, SAVED_CONFIG, type Sale } from '../data/sales';

type Variant = 'default' | 'iconOnly' | 'trimmed' | 'none' | 'responsive' | 'overflow';

const CAPTIONS: Record<Variant, string> = {
  default: 'Default toolbar — every tool, labeled buttons. Zero configuration.',
  iconOnly: 'toolbar={{ iconOnly: true }} — same tools, icon-only buttons with tooltips.',
  trimmed: 'toolbar={{ export: false, density: false }} — per-tool flags hide individual controls.',
  none: 'toolbar={false} — no toolbar at all.',
  responsive:
    'Composed ResponsiveToolbar — shrink the window: trailing buttons collapse into the 3-dot menu and come back when there’s room.',
  overflow: 'Composed OverflowMenu — tools always tucked behind the 3-dot menu, regardless of width.',
};

/** Toolbar variations: the monolithic flags plus the two composed layouts. */
export function ToolbarTab() {
  const [variant, setVariant] = useState<Variant>('default');
  const rows = getSales(500);

  const shared = {
    columns: SAVED_CONFIG,
    rows,
    getRowId: (r: Sale) => r.id,
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={variant}
          onChange={(_, v: Variant | null) => v && setVariant(v)}
          aria-label="Toolbar variant"
        >
          <ToggleButton value="default">Default</ToggleButton>
          <ToggleButton value="iconOnly">Icon-only</ToggleButton>
          <ToggleButton value="trimmed">Trimmed</ToggleButton>
          <ToggleButton value="none">None</ToggleButton>
          <ToggleButton value="responsive">ResponsiveToolbar</ToggleButton>
          <ToggleButton value="overflow">OverflowMenu</ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="body2" color="text.secondary">
          {CAPTIONS[variant]}
        </Typography>
      </Stack>

      {variant === 'responsive' ? (
        <DataGrid.Provider<Sale> {...shared}>
          <DataGrid.Container height={480}>
            <DataGrid.ResponsiveToolbar
              prefix={<DataGrid.QuickFilter placeholder="Search…" sx={{ minWidth: 220 }} />}
            >
              <DataGrid.FilterToggle />
              <DataGrid.ColumnsButton />
              <DataGrid.DensityButton />
              <DataGrid.WrapToggle />
              <DataGrid.ExportButton />
            </DataGrid.ResponsiveToolbar>
            <DataGrid.Table<Sale> />
            <DataGrid.Pagination />
          </DataGrid.Container>
        </DataGrid.Provider>
      ) : variant === 'overflow' ? (
        <DataGrid.Provider<Sale> {...shared}>
          <DataGrid.Container height={480}>
            <DataGrid.Toolbar>
              <DataGrid.QuickFilter placeholder="Search…" sx={{ minWidth: 220 }} />
              <DataGrid.FilterToggle />
              {/* spacer pushes the 3-dot menu to the right edge */}
              <span style={{ flex: 1 }} />
              <DataGrid.OverflowMenu>
                <DataGrid.ColumnsButton />
                <DataGrid.DensityButton />
                <DataGrid.WrapToggle />
                <DataGrid.ExportButton />
              </DataGrid.OverflowMenu>
            </DataGrid.Toolbar>
            <DataGrid.Table<Sale> />
            <DataGrid.Pagination />
          </DataGrid.Container>
        </DataGrid.Provider>
      ) : (
        <DataGrid<Sale>
          key={variant}
          {...shared}
          toolbar={
            variant === 'none'
              ? false
              : variant === 'iconOnly'
                ? { iconOnly: true }
                : variant === 'trimmed'
                  ? { export: false, density: false }
                  : undefined
          }
          height={480}
        />
      )}
    </Stack>
  );
}
