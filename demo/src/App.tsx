import { useMemo } from 'react';
import { Box, Container, Stack, Typography } from '@mui/material';
import { DataGrid, type DataGridConfig } from 'og-data-grid';

// A serializable column layout, as it might be persisted in a DB — plain JSON,
// no functions. Also shows off cellStyle/styleRules (variant, textColor,
// backgroundColor, fontWeight, fontStyle) and a merged column.
const SAVED_LAYOUT = `{
  "columns": [
    { "field": "id", "header": "ID", "width": 90 },
    { "field": "date", "header": "Date", "format": "date", "width": 130 },
    {
      "field": "region",
      "groupable": true,
      "styleRules": [
        { "op": "equals", "value": "North", "style": { "variant": "chip", "backgroundColor": "#e3f2fd", "textColor": "#1565c0", "fontWeight": "bold" } },
        { "op": "equals", "value": "South", "style": { "variant": "chip", "backgroundColor": "#fff3e0", "textColor": "#ef6c00", "fontWeight": "bold" } },
        { "op": "equals", "value": "East", "style": { "variant": "chip", "backgroundColor": "#e0f2f1", "textColor": "#00897b" } },
        { "op": "equals", "value": "West", "style": { "variant": "chip", "backgroundColor": "#f3e5f5", "textColor": "#6a1b9a" } }
      ]
    },
    {
      "field": "category",
      "groupable": true,
      "cellStyle": { "fontStyle": "italic" },
      "styleRules": [
        { "op": "equals", "value": "Hardware", "style": { "backgroundColor": "#e3f2fd" } },
        { "op": "equals", "value": "Software", "style": { "backgroundColor": "#f3e5f5" } },
        { "op": "equals", "value": "Services", "style": { "backgroundColor": "#e8f5e9" } }
      ]
    },
    { "field": "product", "header": "Product", "width": 150 },
    {
      "field": "regionProduct",
      "header": "Region / Product",
      "width": 200,
      "merge": { "fields": ["region", "product"], "separator": " — " }
    },
    { "field": "rep", "header": "Sales Rep", "groupable": true },
    {
      "field": "units",
      "header": "Units",
      "align": "right",
      "format": "number",
      "aggregation": "sum",
      "styleRules": [
        { "op": "lt", "value": 10, "style": { "textColor": "#9e9e9e", "fontStyle": "italic" } },
        { "op": "gte", "value": 40, "style": { "textColor": "#2e7d32", "fontWeight": "bold" } }
      ]
    },
    {
      "field": "unitPrice",
      "header": "Unit Price",
      "align": "right",
      "format": "currency",
      "formatOptions": { "currency": "USD" },
      "aggregation": "avg",
      "styleRules": [
        { "op": "between", "value": 200, "value2": 300, "style": { "backgroundColor": "#fff3e0", "fontWeight": "bold" } }
      ]
    },
    {
      "field": "revenue",
      "header": "Revenue",
      "align": "right",
      "format": "currency",
      "formatOptions": { "currency": "USD", "maximumFractionDigits": 0 },
      "aggregation": "sum",
      "styleRules": [
        { "op": "lt", "value": 2000, "style": { "textColor": "#b00020" } },
        { "op": "gte", "value": 8000, "style": { "backgroundColor": "#e6f4ea", "fontWeight": "bold" } }
      ]
    },
    {
      "field": "active",
      "header": "Active",
      "format": "boolean",
      "styleRules": [
        { "op": "equals", "value": true, "style": { "variant": "chip", "backgroundColor": "#e8f5e9", "textColor": "#2e7d32", "fontWeight": "bold" } },
        { "op": "equals", "value": false, "style": { "variant": "chip", "backgroundColor": "#fdecea", "textColor": "#b00020" } }
      ]
    }
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
