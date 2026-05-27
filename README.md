# og-data-grid

A read-only React data grid built on **TanStack Table v8** with **MUI** styling. Feature-matched to AG Grid Community (minus editing), in a single ~30 KB-ish library.

```bash
npm install og-data-grid
# peers:
npm install @mui/material @mui/icons-material @mui/x-date-pickers @emotion/react @emotion/styled
```

## Features (v1)

- **Sorting** — single + shift-click multi-sort
- **Per-column filters** — text / number-range / date-range / select / multi-select / boolean
- **Advanced filter builder** — AND/OR groups with nested logic, serializable to `{ field, op, value }` trees
- **Global quick search** — debounced, scans every visible cell
- **Column visibility** — toolbar menu with checkboxes, "show all / hide all", and search
- **Column resize** — drag column edges
- **Row grouping** — multi-level, with expand/collapse
- **Aggregation** — `sum` / `avg` / `min` / `max` / `count` / `uniqueCount` per column, or custom
- **Row virtualization** — `@tanstack/react-virtual`; activates automatically when pagination is off
- **Pagination** — client-side via MUI `TablePagination`, configurable page sizes
- **Row selection** — single or multi, with checkboxes
- **Density** — compact / standard / comfortable
- **CSV export** — honors visible columns, sort order, expanded groups, and `meta.exportValue`
- **Overlays** — `loading`, `noRowsOverlay`, `errorOverlay` slots
- **Sticky header**, MUI theme-aware styling

Editing, master-detail, pivoting, column reorder, and column pinning are deliberately out of scope for v1.

## Usage

```tsx
import { DataGrid, type DataGridColumnDef } from 'og-data-grid';

type Sale = { id: string; product: string; revenue: number; region: string };

const columns: DataGridColumnDef<Sale>[] = [
  { accessorKey: 'id', header: 'ID', size: 100 },
  {
    accessorKey: 'product',
    header: 'Product',
    meta: { filterVariant: 'text' },
  },
  {
    accessorKey: 'region',
    header: 'Region',
    meta: {
      filterVariant: 'multiSelect',
      filterOptions: [
        { label: 'North', value: 'North' },
        { label: 'South', value: 'South' },
      ],
      groupable: true,
    },
  },
  {
    accessorKey: 'revenue',
    header: 'Revenue',
    cell: ({ getValue }) => `$${getValue<number>().toLocaleString()}`,
    meta: {
      filterVariant: 'number',
      align: 'right',
      aggregationFn: 'sum',
    },
  },
];

export function Page({ rows }: { rows: Sale[] }) {
  return (
    <DataGrid<Sale>
      columns={columns}
      rows={rows}
      getRowId={(r) => r.id}
      selection={{ mode: 'multi' }}
      initialState={{ showFilters: true }}
    />
  );
}
```

You must wrap your app in MUI's `ThemeProvider` and (if you use date filters) `LocalizationProvider`:

```tsx
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

<ThemeProvider theme={theme}>
  <LocalizationProvider dateAdapter={AdapterDayjs}>
    <App />
  </LocalizationProvider>
</ThemeProvider>
```

## Column meta

`meta` extends TanStack's `ColumnDef` with grid-specific config:

| Field | Purpose |
|---|---|
| `filterVariant` | `'text' \| 'number' \| 'date' \| 'select' \| 'multiSelect' \| 'boolean'` |
| `filterOptions` | `{ label, value }[]` for `select` / `multiSelect` |
| `align` | Cell alignment: `'left' \| 'right' \| 'center'` |
| `headerTooltip` | Tooltip shown on the header label |
| `hideable` | Default `true`. Set `false` to lock a column visible. |
| `resizable` | Default `true`. |
| `groupable` | Default `false`. Required to appear in the Group-by menu. |
| `aggregationFn` | `'sum' \| 'avg' \| 'min' \| 'max' \| 'count' \| 'uniqueCount'` |
| `aggregatedCell` | Custom renderer for the cell in a group row |
| `exportValue` | `(row) => string \| number` — overrides the default value used in CSV export |

For custom per-column filtering logic, supply your own `filterFn` on the `ColumnDef` directly (TanStack's standard API).

## State

All state is uncontrolled by default. To persist or sync (e.g. to URL params):

```tsx
const [gridState, setGridState] = useState<Partial<DataGridState>>({});

<DataGrid
  columns={columns}
  rows={rows}
  initialState={gridState}
  onStateChange={setGridState}
/>
```

The `DataGridState` shape (sorting, filters, visibility, grouping, expanded, pagination, advanced filter, density, etc.) is exported.

## Extensibility — server-side later

v1 is client-only by design. The architecture leaves a single seam for server-side mode:

- All filter/sort/group state changes route through `onStateChange`.
- The advanced filter is already a serializable `{ field, op, value, combinator }` tree — safe to send as a query string.
- Adding a future `serverSide={{ fetchRows }}` prop is a hook-level change (`manualPagination` / `manualSorting` / `manualFiltering` flags on the TanStack instance) — no API rewrite for consumers.

## Development

```bash
npm install
npm run dev         # demo app at http://localhost:5173
npm run typecheck
npm run build       # emits dist/
```

The `demo/` folder is a working consumer (2,500-row sales dataset) that exercises every feature.
