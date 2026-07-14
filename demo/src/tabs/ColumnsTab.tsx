import { useState } from 'react';
import { Chip, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { DataGrid, formatCellValue, type DataGridColumnDef } from 'og-data-grid';
import { getSales, SAVED_CONFIG, type Sale } from '../data/sales';

type ColumnMode = 'config' | 'defs' | 'auto';

const CAPTIONS: Record<ColumnMode, string> = {
  config:
    'JSON DataGridConfig — serializable (DB-storable): formats, chip styleRules, a merged column, initial sort.',
  defs:
    'Programmatic DataGridColumnDef[] — functions allowed: custom cell renderer, explicit filter variants, exportValue, header tooltip.',
  auto: 'No `columns` prop at all — columns and filter variants are inferred from the row data.',
};

// Programmatic defs: things the JSON config can't express (custom renderers,
// accessor functions) plus explicit filter variants instead of inference.
const PROGRAMMATIC_COLUMNS: DataGridColumnDef<Sale>[] = [
  { accessorKey: 'id', header: 'ID', size: 90 },
  {
    accessorKey: 'date',
    header: 'Date',
    size: 130,
    cell: ({ getValue }) => formatCellValue(getValue(), 'date'),
    meta: { filterVariant: 'date' },
  },
  {
    accessorKey: 'region',
    header: 'Region',
    meta: {
      filterVariant: 'multiSelect',
      filterOptions: ['North', 'South', 'East', 'West'].map((r) => ({ label: r, value: r })),
      headerTooltip: 'Sales region (multi-select filter)',
    },
  },
  {
    accessorKey: 'product',
    header: 'Product',
    size: 150,
    meta: { filterVariant: 'text' },
  },
  {
    accessorKey: 'units',
    header: 'Units',
    meta: { align: 'right', filterVariant: 'number' },
  },
  {
    accessorKey: 'revenue',
    header: 'Revenue',
    // custom cell renderer: chip color by revenue band
    cell: ({ getValue }) => {
      const v = getValue() as number;
      const label = String(formatCellValue(v, 'currency', { currency: 'USD', maximumFractionDigits: 0 }));
      return (
        <Chip
          size="small"
          label={label}
          color={v >= 8000 ? 'success' : v < 2000 ? 'error' : 'default'}
          variant={v >= 8000 || v < 2000 ? 'filled' : 'outlined'}
        />
      );
    },
    meta: {
      align: 'right',
      filterVariant: 'number',
      headerTooltip: 'Units × unit price',
      // CSV export writes the raw number, not the chip
      exportValue: (row) => row.revenue,
    },
  },
  {
    accessorKey: 'active',
    header: 'Active',
    meta: { filterVariant: 'boolean' },
  },
];

/** Three ways to define columns: JSON config, programmatic defs, auto-generated. */
export function ColumnsTab() {
  const [colMode, setColMode] = useState<ColumnMode>('config');
  const rows = getSales(500);

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={colMode}
          onChange={(_, v: ColumnMode | null) => v && setColMode(v)}
          aria-label="Column definition mode"
        >
          <ToggleButton value="config">JSON config</ToggleButton>
          <ToggleButton value="defs">Programmatic defs</ToggleButton>
          <ToggleButton value="auto">Auto-generated</ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="body2" color="text.secondary">
          {CAPTIONS[colMode]}
        </Typography>
      </Stack>

      <DataGrid<Sale>
        key={colMode}
        columns={colMode === 'config' ? SAVED_CONFIG : colMode === 'defs' ? PROGRAMMATIC_COLUMNS : undefined}
        rows={rows}
        getRowId={(r) => r.id}
        height={560}
        initialState={{ showFilters: true }}
        csvFileName={`sales-${colMode}.csv`}
      />
    </Stack>
  );
}
