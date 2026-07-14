import { useState } from 'react';
import {
  CircularProgress,
  FormControlLabel,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { DataGrid } from 'og-data-grid';
import { getSales, getSalesWithGaps, SAVED_CONFIG, type Sale, type SaleWithGaps } from '../data/sales';

type StateMode = 'loading' | 'empty' | 'error' | 'gaps';

const CAPTIONS: Record<StateMode, string> = {
  loading: 'loading={true} — overlay while data is on its way.',
  empty: 'rows={[]} — the no-rows overlay.',
  error: 'error prop — the error overlay.',
  gaps: 'Rows with null cells — `emptyText` controls the placeholder (default "N/A").',
};

/** Loading / empty / error overlays (default vs custom slots) and empty-cell text. */
export function StatesTab() {
  const [stateMode, setStateMode] = useState<StateMode>('loading');
  const [customSlots, setCustomSlots] = useState(true);

  const rows = getSales(500);
  const gapRows = getSalesWithGaps(200);

  const slots = customSlots
    ? {
        loadingOverlay: (
          <Stack alignItems="center" spacing={1}>
            <CircularProgress size={24} />
            <Typography variant="body2" color="text.secondary">
              Fetching sales…
            </Typography>
          </Stack>
        ),
        noRowsOverlay: <Typography color="text.secondary">No sales to show yet 🤷</Typography>,
        errorOverlay: (
          <Typography color="error">💥 Custom error overlay: the sales service is down.</Typography>
        ),
      }
    : undefined;

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={stateMode}
          onChange={(_, v: StateMode | null) => v && setStateMode(v)}
          aria-label="Grid state"
        >
          <ToggleButton value="loading">Loading</ToggleButton>
          <ToggleButton value="empty">Empty</ToggleButton>
          <ToggleButton value="error">Error</ToggleButton>
          <ToggleButton value="gaps">Empty cells</ToggleButton>
        </ToggleButtonGroup>
        {stateMode !== 'gaps' && (
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={customSlots}
                onChange={(e) => setCustomSlots(e.target.checked)}
              />
            }
            label="Custom overlay slots"
          />
        )}
        <Typography variant="body2" color="text.secondary">
          {CAPTIONS[stateMode]}
        </Typography>
      </Stack>

      {stateMode === 'gaps' ? (
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
          <DataGrid<SaleWithGaps>
            columns={SAVED_CONFIG}
            rows={gapRows}
            getRowId={(r) => r.id}
            title="Default emptyText"
            subtitle='Null cells show "N/A"'
            height={420}
            toolbar={false}
          />
          <DataGrid<SaleWithGaps>
            columns={SAVED_CONFIG}
            rows={gapRows}
            getRowId={(r) => r.id}
            title="emptyText=&quot;—&quot;"
            subtitle="Null cells show an em dash"
            emptyText="—"
            height={420}
            toolbar={false}
          />
        </Stack>
      ) : (
        <DataGrid<Sale>
          columns={SAVED_CONFIG}
          rows={stateMode === 'empty' ? [] : rows}
          getRowId={(r) => r.id}
          loading={stateMode === 'loading'}
          error={stateMode === 'error' ? 'Failed to fetch sales' : undefined}
          slots={slots}
          height={480}
        />
      )}
    </Stack>
  );
}
