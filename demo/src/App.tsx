import { useMemo } from 'react';
import { Box, Container, Stack, Typography } from '@mui/material';
import { DataGrid } from 'og-data-grid';

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

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h4">OGDataGrid Demo</Typography>
          <Typography variant="body2" color="text.secondary">
            {rows.length.toLocaleString()} rows — columns generated from the data;
            sort, filter, group, hide, resize, paginate, select.
          </Typography>
        </Box>
        <Box sx={{ height: 640 }}>
          {/* No `columns` prop — they're derived from the row data, and each
              column's filter variant is then inferred from the values. */}
          <DataGrid<Sale>
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
