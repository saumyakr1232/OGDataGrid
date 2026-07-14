import { useState } from 'react';
import {
  Button,
  Chip,
  CircularProgress,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { DataGrid, useDataGridMeta, type CellClickParams } from 'og-data-grid';
import { getSales, SAVED_CONFIG, type Sale } from '../data/sales';

interface GridMeta {
  company: string;
}

// A custom toolbar piece that reads shared data off the provider. It works
// unchanged in BOTH modes: inside a composed ResponsiveToolbar and inside the
// all-in-one grid's `slots.toolbarExtras` — same context either way.
function CompanyBadge() {
  const meta = useDataGridMeta<GridMeta>();
  return meta ? <Chip size="small" label={meta.company} /> : null;
}

type Mode = 'composition' | 'normal';

/**
 * The flagship grid, built two ways from identical props/data:
 *  - "Composition": Provider + Container + Header + ResponsiveToolbar + parts.
 *  - "Normal": the all-in-one `<DataGrid />` element.
 */
export function ShowcaseTab() {
  const [mode, setMode] = useState<Mode>('composition');
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [lastClick, setLastClick] = useState('');

  const rows = getSales(50000);

  const simulateLoad = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 900);
  };

  const handleCellClick = (p: CellClickParams<Sale>) =>
    setLastClick(`${p.columnId} = ${String(p.value)} (row ${p.rowId})`);

  // Everything both modes share.
  const meta = { company: 'Acme Corp' } satisfies GridMeta;
  const slots = {
    loadingOverlay: (
      <Stack alignItems="center" spacing={1}>
        <CircularProgress size={24} />
        <Typography variant="body2" color="text.secondary">
          Fetching sales…
        </Typography>
      </Stack>
    ),
    noRowsOverlay: <Typography color="text.secondary">No sales to show yet 🤷</Typography>,
  };
  const demoButtons = (
    <>
      <CompanyBadge />
      <Button size="small" variant="outlined" onClick={simulateLoad}>
        Simulate load
      </Button>
      <Button size="small" variant="outlined" onClick={() => setEmpty((e) => !e)}>
        {empty ? 'Show rows' : 'Clear rows'}
      </Button>
    </>
  );
  const sharedProps = {
    columns: SAVED_CONFIG,
    rows: empty ? [] : rows,
    loading,
    getRowId: (r: Sale) => r.id,
    selection: { mode: 'multi' } as const,
    density: 'standard' as const,
    initialState: { showFilters: true, pagination: { pageIndex: 0, pageSize: 25 } },
    csvFileName: 'sales.csv',
    onCellClick: handleCellClick,
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={mode}
          onChange={(_, v: Mode | null) => v && setMode(v)}
          aria-label="API mode"
        >
          <ToggleButton value="composition">Composition</ToggleButton>
          <ToggleButton value="normal">Normal</ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="body2" color="text.secondary">
          {mode === 'composition'
            ? 'Custom layout from Provider + Container + parts (ResponsiveToolbar, centered header).'
            : 'The same grid as a single <DataGrid /> element — default toolbar, custom parts via slots.toolbarExtras.'}
          {lastClick && ` · Last cell clicked: ${lastClick}`}
        </Typography>
      </Stack>

      {mode === 'composition' ? (
        <DataGrid.Provider<Sale> {...sharedProps} meta={meta} slots={slots}>
          <DataGrid.Container height={640}>
            <DataGrid.Header title="Sales" sx={{ textAlign: 'center' }} />
            {/*
              ResponsiveToolbar auto-collapses trailing controls into a 3-dot
              menu as the toolbar narrows (priority order: last collapses first).
            */}
            <DataGrid.ResponsiveToolbar
              prefix={<DataGrid.QuickFilter placeholder="Search sales…" sx={{ minWidth: 260 }} />}
            >
              <DataGrid.FilterToggle iconOnly />
              <DataGrid.ResetFilters iconOnly />
              <DataGrid.ColumnsButton iconOnly />
              <DataGrid.DensityButton iconOnly />
              <DataGrid.WrapToggle iconOnly />
              <DataGrid.ExportButton iconOnly />
              {demoButtons}
            </DataGrid.ResponsiveToolbar>
            <DataGrid.Table<Sale> />
            <DataGrid.Pagination />
          </DataGrid.Container>
        </DataGrid.Provider>
      ) : (
        <DataGrid<Sale>
          {...sharedProps}
          meta={meta}
          slots={{ ...slots, toolbarExtras: demoButtons }}
          title="Sales"
          toolbar={{ iconOnly: true }}
          height={640}
        />
      )}
    </Stack>
  );
}
