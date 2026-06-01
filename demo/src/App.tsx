import { useMemo } from 'react';
import { Box, Container, Stack, Typography } from '@mui/material';
import { DataGrid, type DataGridConfig } from 'og-data-grid';

// A serializable column layout, exactly as it might be persisted in a DB.
// Note it is a plain JSON string — no functions — yet it configures headers,
// widths, alignment, value formatting, filters, grouping and sorting.
const SAVED_LAYOUT = `{
  "columns": [
    { "field": "id", "header": "ID", "width": 90 },
    { "field": "date", "header": "Date", "format": "date", "width": 130 },
    { "field": "region", "groupable": true },
    { "field": "category", "groupable": true },
    { "field": "product", "header": "Product", "width": 150 },
    { "field": "rep", "header": "Sales Rep", "groupable": true },
    { "field": "units", "header": "Units", "align": "right", "format": "number", "aggregation": "sum" },
    { "field": "unitPrice", "header": "Unit Price", "align": "right", "format": "currency", "formatOptions": { "currency": "USD" }, "aggregation": "avg" },
    { "field": "revenue", "header": "Revenue", "align": "right", "format": "currency", "formatOptions": { "currency": "USD", "maximumFractionDigits": 0 }, "aggregation": "sum" },
    { "field": "active", "header": "Active", "format": "boolean" }
  ],
  "sorting": [{ "field": "revenue", "desc": true }]
}`;

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

  // Load the layout from its stored string, exactly as you would after reading
  // it from a database, then hand the parsed object straight to `columns`.
  const columns = useMemo(() => JSON.parse(SAVED_LAYOUT) as DataGridConfig, []);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h4">OGDataGrid Demo</Typography>
          <Typography variant="body2" color="text.secondary">
            {rows.length.toLocaleString()} rows — columns configured from a stored
            JSON layout; sort, filter, group, hide, resize, paginate, select.
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
