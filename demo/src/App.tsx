import { useMemo, useState } from 'react';
import { Box, Button, Chip, CircularProgress, Container, Stack, Typography } from '@mui/material';
import {
  DataGrid,
  useDataGridMeta,
  type CellClickParams,
  type DataGridConfig,
} from 'og-data-grid';

interface GridMeta {
  company: string;
}

// A custom toolbar piece that reads shared data off the provider.
function CompanyBadge() {
  const meta = useDataGridMeta<GridMeta>();
  return meta ? <Chip size="small" label={meta.company} /> : null;
}

// A serializable column layout, as it might be persisted in a DB.
const SAVED_LAYOUT = `{
  "columns": [
    { "field": "id", "header": "ID", "width": 90 },
    { "field": "date", "header": "Date", "format": "date", "width": 130 },
    {
      "field": "region",
      "styleRules": [
        { "op": "equals", "value": "North", "style": { "variant": "chip", "backgroundColor": "#e3f2fd", "textColor": "#1565c0", "fontWeight": "bold" } },
        { "op": "equals", "value": "South", "style": { "variant": "chip", "backgroundColor": "#fff3e0", "textColor": "#ef6c00", "fontWeight": "bold" } },
        { "op": "equals", "value": "East", "style": { "variant": "chip", "backgroundColor": "#e0f2f1", "textColor": "#00897b" } },
        { "op": "equals", "value": "West", "style": { "variant": "chip", "backgroundColor": "#f3e5f5", "textColor": "#6a1b9a" } }
      ]
    },
    {
      "field": "category",
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
    { "field": "rep", "header": "Sales Rep" },
    {
      "field": "units",
      "header": "Units",
      "align": "right",
      "format": "number",
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
  const allRows = useMemo(() => genRows(50000), []);
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [lastClick, setLastClick] = useState('');

  const columns = useMemo(() => JSON.parse(SAVED_LAYOUT) as DataGridConfig, []);

  const simulateLoad = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 900);
  };

  const handleCellClick = (p: CellClickParams<Sale>) =>
    setLastClick(`${p.columnId} = ${String(p.value)} (row ${p.rowId})`);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h4">OGDataGrid Demo</Typography>
          <Typography variant="body2" color="text.secondary">
            {allRows.length.toLocaleString()} rows — composed from Provider + Container + parts.
            {lastClick && ` · last cell clicked: ${lastClick}`}
          </Typography>
        </Box>

        {/*
          Sizing knobs:
          - table height → DataGrid.Container `height`
          - row height preset → `density` ("compact" | "standard" | "comfortable")
          - exact row height → `rowHeight` (overrides density), see the bare table below
        */}
        <DataGrid.Provider<Sale>
          columns={columns}
          rows={empty ? [] : allRows}
          loading={loading}
          getRowId={(r) => r.id}
          selection={{ mode: 'multi' }}
          density="standard"
          initialState={{ showFilters: true, pagination: { pageIndex: 0, pageSize: 25 } }}
          csvFileName="sales.csv"
          meta={{ company: 'Acme Corp' } satisfies GridMeta}
          onCellClick={handleCellClick}
          slots={{
            loadingOverlay: (
              <Stack alignItems="center" spacing={1}>
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary">Fetching sales…</Typography>
              </Stack>
            ),
            noRowsOverlay: <Typography color="text.secondary">No sales to show yet 🤷</Typography>,
          }}
        >
          <DataGrid.Container height={640}>
            <DataGrid.Header title="Sales" sx={{ textAlign: 'center' }} />
            {/*
              ResponsiveToolbar auto-collapses trailing controls into a 3-dot
              menu as the toolbar narrows (priority order: last collapses first).
              To force controls behind a menu regardless of width, wrap them in
              <DataGrid.OverflowMenu> instead.
            */}
            <DataGrid.ResponsiveToolbar
              prefix={<DataGrid.QuickFilter placeholder="Search sales…" sx={{ minWidth: 260 }} />}
            >
              <DataGrid.FilterToggle iconOnly />
              <DataGrid.ColumnsButton iconOnly />
              <DataGrid.DensityButton iconOnly />
              <DataGrid.WrapToggle iconOnly />
              <DataGrid.ExportButton iconOnly />
              <CompanyBadge />
              <Button size="small" variant="outlined" onClick={simulateLoad}>
                Simulate load
              </Button>
              <Button size="small" variant="outlined" onClick={() => setEmpty((e) => !e)}>
                {empty ? 'Show rows' : 'Clear rows'}
              </Button>
            </DataGrid.ResponsiveToolbar>
            <DataGrid.Table<Sale> />
            <DataGrid.Pagination />
          </DataGrid.Container>
        </DataGrid.Provider>

        <Box>
          <Typography variant="h6">Bare table</Typography>
          <Typography variant="body2" color="text.secondary">
            Just Provider + Container + Table + Pagination — compact density, fixed 64px rows.
          </Typography>
        </Box>
        <DataGrid.Provider<Sale>
          columns={columns}
          rows={allRows}
          getRowId={(r) => r.id}
          density="compact"
          rowHeight={64}
          pagination={{ pageSize: 10 }}
        >
          <DataGrid.Container height={360}>
            <DataGrid.Table<Sale> />
            <DataGrid.Pagination pageSizeOptions={[5, 10, 20]} />
          </DataGrid.Container>
        </DataGrid.Provider>
      </Stack>
    </Container>
  );
}
