import { useState } from 'react';
import {
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { DataGrid, type Density } from 'og-data-grid';
import { getSales, SAVED_CONFIG, type Sale } from '../data/sales';

/**
 * 50,000 rows with `pagination={false}` — the configuration where row
 * virtualization kicks in (virtual scrolling is active only when pagination is
 * off). Also demos the sizing knobs: container height, density presets, and a
 * fixed `rowHeight` override.
 */
export function VirtualizationTab() {
  const [height, setHeight] = useState(560);
  const [density, setDensity] = useState<Density>('standard');
  const [fixedRowHeight, setFixedRowHeight] = useState(false);

  const rows = getSales(50000);

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="vh-label">Height</InputLabel>
          <Select
            labelId="vh-label"
            label="Height"
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
          >
            <MenuItem value={400}>400px</MenuItem>
            <MenuItem value={560}>560px</MenuItem>
            <MenuItem value={720}>720px</MenuItem>
          </Select>
        </FormControl>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={density}
          onChange={(_, v: Density | null) => v && setDensity(v)}
          aria-label="Density"
        >
          <ToggleButton value="compact">Compact</ToggleButton>
          <ToggleButton value="standard">Standard</ToggleButton>
          <ToggleButton value="comfortable">Comfortable</ToggleButton>
        </ToggleButtonGroup>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={fixedRowHeight}
              onChange={(e) => setFixedRowHeight(e.target.checked)}
            />
          }
          label="Fixed 64px rows"
        />
        <Typography variant="body2" color="text.secondary">
          {rows.length.toLocaleString()} rows, no pagination — scroll is virtualized.
        </Typography>
      </Stack>

      <DataGrid<Sale>
        key={`${density}-${fixedRowHeight}`} // density/rowHeight are initial sizing → remount to apply
        columns={SAVED_CONFIG}
        rows={rows}
        getRowId={(r) => r.id}
        pagination={false}
        density={density}
        rowHeight={fixedRowHeight ? 64 : undefined}
        height={height}
        title="All sales"
        subtitle="Virtualized — no pagination footer below"
      />
    </Stack>
  );
}
