import { useMemo } from 'react';
import { Box, Chip, Container, Stack, Typography } from '@mui/material';
import { DataGrid, type DataGridColumnDef } from 'og-data-grid';

interface Sale {
  id: string;
  date: Date;
  region: 'North' | 'South' | 'East' | 'West';
  product: string;
  category: 'Hardware' | 'Software' | 'Services';
  units: number;
  unitPrice: number;
  revenue: number;
  active: boolean;
  rep: string;
}

const REGIONS: Sale['region'][] = ['North', 'South', 'East', 'West'];
const CATEGORIES: Sale['category'][] = ['Hardware', 'Software', 'Services'];
const PRODUCTS = [
  'Widget Pro', 'Gizmo', 'Cog', 'Sprocket', 'Bolt Kit',
  'Linchpin', 'Hinge', 'Casing', 'Bushing', 'Bearing',
];
const REPS = ['Ada', 'Linus', 'Grace', 'Alan', 'Hedy', 'Ken'];

function rnd<T>(arr: T[], i: number): T { return arr[i % arr.length]; }

function genRows(n: number): Sale[] {
  const out: Sale[] = [];
  const base = new Date(2024, 0, 1);
  for (let i = 0; i < n; i++) {
    const units = 1 + ((i * 7) % 50);
    const unitPrice = 10 + ((i * 13) % 290);
    out.push({
      id: `s${i}`,
      date: new Date(base.getTime() + (i * 86400000 * 3) / 7),
      region: rnd(REGIONS, i),
      product: rnd(PRODUCTS, i),
      category: rnd(CATEGORIES, i),
      units,
      unitPrice,
      revenue: units * unitPrice,
      active: i % 4 !== 0,
      rep: rnd(REPS, i),
    });
  }
  return out;
}

export default function App() {
  const rows = useMemo(() => genRows(2500), []);

  const columns = useMemo<DataGridColumnDef<Sale>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        size: 90,
        meta: { hideable: true },
      },
      {
        accessorKey: 'date',
        header: 'Date',
        size: 140,
        cell: ({ getValue }) => (getValue<Date>()).toLocaleDateString(),
        // Variant inferred as `date` from the data; exportValue stays explicit.
        meta: { exportValue: (r) => r.date.toISOString().slice(0, 10) },
        sortingFn: 'datetime',
      },
      {
        accessorKey: 'region',
        header: 'Region',
        size: 110,
        // Explicit `multiSelect` — inference only ever produces single `select`,
        // so this demonstrates a consumer override winning over inference.
        meta: {
          filterVariant: 'multiSelect',
          filterOptions: REGIONS.map((r) => ({ label: r, value: r })),
          groupable: true,
        },
      },
      {
        accessorKey: 'category',
        header: 'Category',
        size: 120,
        // Variant + options inferred as a `select` from the data.
        meta: { groupable: true },
      },
      {
        accessorKey: 'product',
        header: 'Product',
        size: 160,
        // No meta needed — the small catalog is inferred as a `select` dropdown.
      },
      {
        accessorKey: 'rep',
        header: 'Sales Rep',
        size: 120,
        // Variant + options inferred as a `select` from the data.
        meta: { groupable: true },
      },
      {
        accessorKey: 'units',
        header: 'Units',
        size: 100,
        // Inferred as `number`; filterFn auto-wired.
        meta: {
          align: 'right',
          aggregationFn: 'sum',
        },
      },
      {
        accessorKey: 'unitPrice',
        header: 'Unit price',
        size: 120,
        meta: {
          align: 'right',
          aggregationFn: 'avg',
        },
        cell: ({ getValue }) => `$${getValue<number>().toFixed(2)}`,
        aggregatedCell: ({ getValue }) => `$${Number(getValue() ?? 0).toFixed(2)} avg`,
      },
      {
        accessorKey: 'revenue',
        header: 'Revenue',
        size: 140,
        meta: {
          align: 'right',
          aggregationFn: 'sum',
        },
        cell: ({ getValue }) =>
          `$${getValue<number>().toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        aggregatedCell: ({ getValue }) =>
          `$${Number(getValue() ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      },
      {
        accessorKey: 'active',
        header: 'Active',
        size: 100,
        // Inferred as `boolean`.
        cell: ({ getValue }) =>
          getValue<boolean>() ? <Chip label="Yes" size="small" color="success" /> : <Chip label="No" size="small" />,
      },
    ],
    [],
  );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h4">OGDataGrid Demo</Typography>
          <Typography variant="body2" color="text.secondary">
            {rows.length.toLocaleString()} rows — sort, filter, group, hide, resize, paginate, select.
          </Typography>
        </Box>
        <Box sx={{ height: 640 }}>
          <DataGrid<Sale>
            columns={columns}
            rows={rows}
            getRowId={(r) => r.id}
            selection={{ mode: 'multi' }}
            initialState={{
              showFilters: true,
              pagination: { pageIndex: 0, pageSize: 25 },
            }}
            csvFileName="sales.csv"
          />
        </Box>
      </Stack>
    </Container>
  );
}
