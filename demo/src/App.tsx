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
  /** 12-month trailing units series for sparkline */
  trailing: number[];
}

const REGIONS: Sale['region'][] = ['North', 'South', 'East', 'West'];
const CATEGORIES: Sale['category'][] = ['Hardware', 'Software', 'Services'];
const PRODUCTS = [
  'Widget Pro', 'Gizmo', 'Cog', 'Sprocket', 'Bolt Kit',
  'Linchpin', 'Hinge', 'Casing', 'Bushing', 'Bearing',
];
const REPS = ['Ada', 'Linus', 'Grace', 'Alan', 'Hedy', 'Ken'];

function rnd<T>(arr: T[], i: number): T { return arr[i % arr.length]; }

function makeTrail(seed: number): number[] {
  const out: number[] = [];
  let v = 50 + (seed % 20);
  for (let i = 0; i < 12; i++) {
    v += Math.sin(seed + i) * 12 + ((i * seed) % 7) - 3;
    out.push(Math.round(v));
  }
  return out;
}

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
      trailing: makeTrail(i),
    });
  }
  return out;
}

export default function App() {
  const rows = useMemo(() => genRows(2500), []);

  // Aggregate totals row pinned to the bottom of the grid.
  const totals = useMemo(() => {
    const totalUnits = rows.reduce((a, r) => a + r.units, 0);
    const totalRevenue = rows.reduce((a, r) => a + r.revenue, 0);
    return [
      {
        id: '— TOTAL —',
        region: '',
        product: '',
        category: '',
        rep: '',
        units: totalUnits,
        unitPrice: '',
        revenue: totalRevenue,
        active: '',
        date: '',
        trailing: '',
      } as unknown as Sale,
    ];
  }, [rows]);

  const columns = useMemo<DataGridColumnDef<Sale>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        size: 90,
      },
      {
        accessorKey: 'date',
        header: 'Date',
        size: 130,
        cell: ({ getValue }) => {
          const v = getValue<Date>();
          return v instanceof Date ? v.toLocaleDateString() : String(v ?? '');
        },
        meta: { filterVariant: 'date', exportValue: (r) => r.date.toISOString().slice(0, 10) },
        sortingFn: 'datetime',
        filterFn: (row, columnId, value) => {
          const [from, to] = (value as [Date | null, Date | null]) ?? [null, null];
          const v = row.getValue<Date>(columnId);
          if (!(v instanceof Date)) return false;
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
          filterVariant: 'set',
          groupable: true,
          pinnable: true,
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
          filterVariant: 'set',
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
        cell: ({ getValue }) => {
          const v = getValue<number>();
          return typeof v === 'number' ? `$${v.toFixed(2)}` : String(v ?? '');
        },
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
          cellClassRules: {
            'cell-high': (v) => typeof v === 'number' && v > 5000,
          },
        },
        cell: ({ getValue }) => {
          const v = getValue<number>();
          return typeof v === 'number'
            ? `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
            : String(v ?? '');
        },
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
        id: 'trend',
        header: 'Trend (12mo)',
        size: 160,
        meta: {
          sparkline: {
            type: 'area',
            valueAccessor: (r) => r.trailing,
          },
        },
      },
      {
        accessorKey: 'active',
        header: 'Active',
        size: 100,
        meta: { filterVariant: 'boolean' },
        cell: ({ getValue }) => {
          const v = getValue<boolean>();
          if (typeof v !== 'boolean') return String(v ?? '');
          return v ? <Chip label="Yes" size="small" color="success" /> : <Chip label="No" size="small" />;
        },
      },
    ],
    [],
  );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h4">OGDataGrid Demo · v2</Typography>
          <Typography variant="body2" color="text.secondary">
            {rows.length.toLocaleString()} rows — sort, per-column filters, advanced filter, group, hide, resize,
            reorder, pin, paginate, multi-select, status bar, sparklines, master-detail, charts (modal · ECharts),
            pivot, CSV / Excel export. Drag a column header into the "Drop columns here" zone to group.
          </Typography>
        </Box>
        <Box
          sx={{
            height: 720,
            '& .cell-high': {
              background: 'rgba(46, 125, 50, 0.12)',
              fontWeight: 600,
            },
          }}
        >
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
            excelFileName="sales.xlsx"
            pinnedRowsBottom={totals}
            renderDetailPanel={(row) => (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Detail: {row.product} · {row.rep}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Region: {row.region} · Category: {row.category} · Units: {row.units} ·
                  Unit price: ${row.unitPrice.toFixed(2)} · Revenue: ${row.revenue.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  This panel is consumer-supplied via the <code>renderDetailPanel</code> prop.
                </Typography>
              </Box>
            )}
          />
        </Box>
      </Stack>
    </Container>
  );
}
