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
        meta: { filterVariant: 'date', exportValue: (r) => r.date.toISOString().slice(0, 10) },
        sortingFn: 'datetime',
        filterFn: (row, columnId, value) => {
          const [from, to] = (value as [Date | null, Date | null]) ?? [null, null];
          const v = row.getValue<Date>(columnId);
          if (!v) return false;
          if (from && v < from) return false;
          if (to && v > to) return false;
          return true;
        },
      },
      {
        accessorKey: 'region',
        header: 'Region',
        size: 110,
        meta: {
          filterVariant: 'multiSelect',
          filterOptions: REGIONS.map((r) => ({ label: r, value: r })),
          groupable: true,
        },
        filterFn: (row, columnId, value) => {
          if (!value || (value as unknown[]).length === 0) return true;
          return (value as unknown[]).includes(row.getValue(columnId));
        },
      },
      {
        accessorKey: 'category',
        header: 'Category',
        size: 120,
        meta: {
          filterVariant: 'select',
          filterOptions: CATEGORIES.map((c) => ({ label: c, value: c })),
          groupable: true,
        },
      },
      {
        accessorKey: 'product',
        header: 'Product',
        size: 160,
        meta: { filterVariant: 'text' },
      },
      {
        accessorKey: 'rep',
        header: 'Sales Rep',
        size: 120,
        meta: {
          filterVariant: 'select',
          filterOptions: REPS.map((r) => ({ label: r, value: r })),
          groupable: true,
        },
      },
      {
        accessorKey: 'units',
        header: 'Units',
        size: 100,
        meta: {
          filterVariant: 'number',
          align: 'right',
          aggregationFn: 'sum',
        },
        filterFn: (row, columnId, value) => {
          const [min, max] = (value as [number | '', number | '']) ?? ['', ''];
          const n = row.getValue<number>(columnId);
          if (min !== '' && n < min) return false;
          if (max !== '' && n > max) return false;
          return true;
        },
      },
      {
        accessorKey: 'unitPrice',
        header: 'Unit price',
        size: 120,
        meta: {
          filterVariant: 'number',
          align: 'right',
          aggregationFn: 'avg',
        },
        cell: ({ getValue }) => `$${getValue<number>().toFixed(2)}`,
        aggregatedCell: ({ getValue }) => `$${Number(getValue() ?? 0).toFixed(2)} avg`,
        filterFn: (row, columnId, value) => {
          const [min, max] = (value as [number | '', number | '']) ?? ['', ''];
          const n = row.getValue<number>(columnId);
          if (min !== '' && n < min) return false;
          if (max !== '' && n > max) return false;
          return true;
        },
      },
      {
        accessorKey: 'revenue',
        header: 'Revenue',
        size: 140,
        meta: {
          filterVariant: 'number',
          align: 'right',
          aggregationFn: 'sum',
        },
        cell: ({ getValue }) =>
          `$${getValue<number>().toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        aggregatedCell: ({ getValue }) =>
          `$${Number(getValue() ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        filterFn: (row, columnId, value) => {
          const [min, max] = (value as [number | '', number | '']) ?? ['', ''];
          const n = row.getValue<number>(columnId);
          if (min !== '' && n < min) return false;
          if (max !== '' && n > max) return false;
          return true;
        },
      },
      {
        accessorKey: 'active',
        header: 'Active',
        size: 100,
        meta: { filterVariant: 'boolean' },
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
