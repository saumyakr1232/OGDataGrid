# OGDataGrid

A read-only React data grid built on **TanStack Table v8** + **MUI**, feature-matched to AG Grid Community/Enterprise (minus editing).

```tsx
import { DataGrid, type DataGridColumnDef } from 'og-data-grid';

const columns: DataGridColumnDef<Sale>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'region', header: 'Region', meta: { filterVariant: 'set', groupable: true } },
  { accessorKey: 'revenue', header: 'Revenue', meta: { filterVariant: 'number', aggregationFn: 'sum', align: 'right' } },
];

<DataGrid<Sale> columns={columns} rows={rows} getRowId={(r) => r.id} selection={{ mode: 'multi' }} />
```

## Install

```sh
npm i og-data-grid
# Required peer deps
npm i @mui/material @mui/icons-material @emotion/react @emotion/styled @mui/x-date-pickers
# Optional peer deps (lazy-loaded — only if you use the matching feature)
npm i echarts        # for charts
npm i exceljs        # for Excel export
```

## Features

### Core (v1)
- **Sorting** — single + shift-multi
- **Per-column filters** — `text` · `number` (range) · `date` (range) · `select` · `multiSelect` · `boolean` · `set` (Excel-style)
- **Advanced filter builder** — drawer that composes AND/OR groups of `{column, op, value}` rules; serializable JSON output
- **Quick global search** — debounced
- **Column visibility** — toolbar menu with search
- **Column resize** — drag header borders
- **Pagination** — MUI `TablePagination`, configurable page sizes
- **Row selection** — single or multi, pinned-left checkbox column
- **Grouping + aggregation** — drag to "Group by" zone or toggle from header menu; aggregations `sum / avg / min / max / count / uniqueCount / unique`; custom `aggregatedCell` renderer
- **Virtualization** — `@tanstack/react-virtual` for non-paginated grids
- **CSV export** — honours visible cols, sort, grouping; uses `meta.exportValue` if provided
- **Density** — compact / standard / comfortable
- **Slots** — `loadingOverlay` / `noRowsOverlay` / `errorOverlay` / `toolbarExtras`
- **Theming** — pure MUI `sx` + `styled`; picks up the consumer's `ThemeProvider` (no global CSS)

### v2 additions
- **Cell focus + keyboard navigation** — arrow keys / Home / End / PgUp / PgDn / Ctrl+Home/End / Space / Enter / Esc
- **Range selection** — shift+arrows or shift+click extends the range
- **Clipboard copy** — `Ctrl/Cmd+C` on a range emits TSV
- **Column reorder** — drag handles in the header (dnd-kit)
- **Column pinning** — left/right pinning with sticky cells; menu entry per column
- **Drag-to-group zone** — drag any groupable header column into the drop band above the headers
- **Column groups** — multi-row headers from TanStack's nested `columns`
- **Status bar** — selected count + sum/avg/min/max over numeric cells in the active range
- **Sparklines** — inline mini-charts per cell (`line`, `bar`, `area`, `winLoss`) — hand-rolled SVG, no echarts overhead per row
- **Charts (modal)** — `New chart` toolbar button opens a draggable MUI `Dialog`; supports `bar`, `stackedBar`, `line`, `area`, `pie`, `doughnut`, `scatter`; **echarts is peer-loaded lazily on first chart open**. Live re-renders as the user sorts/filters/groups. PNG export + JSON config copy.
- **Chart from selection (AG-Grid style)** — select a range of cells then either right-click → **Chart range** or click the toolbar button which lights up as "Chart range". The dialog opens in *linked* mode: the chart restricts data + columns to the selection and updates as the user resizes the range. Toggle the link icon to **Detach** and freeze a snapshot. Category and series are auto-inferred from the range and stay editable.
- **Cell context menu** — right-click on any cell to get *Chart range*, *Copy*, *Copy with headers*.
- **Pivot** — drawer to pick row groups × column groups × value cols + aggregations; replaces the grid's data with a synthetic pivoted row model
- **Excel export** — lazy-imports `exceljs`; emits `.xlsx` with frozen header + auto-filter
- **Master-detail** — pass `renderDetailPanel(row)` and each row gets an expand chevron
- **Pinned rows** — `pinnedRowsTop` / `pinnedRowsBottom` for totals / footer rows
- **Conditional cell styling** — `meta.cellClassRules: { className: (value, row) => boolean }`

## Column meta reference

```ts
type DataGridColumnMeta<T> = {
  filterVariant?: 'text' | 'number' | 'date' | 'select' | 'multiSelect' | 'boolean' | 'set';
  filterOptions?: { label: string; value: unknown }[]; // select / multiSelect
  align?: 'left' | 'right' | 'center';
  headerTooltip?: string;
  exportValue?: (row: T) => string | number | null | undefined;
  hideable?: boolean;        // default true
  resizable?: boolean;       // default true
  reorderable?: boolean;     // default true
  pinnable?: boolean;        // default true
  groupable?: boolean;       // default false
  aggregationFn?: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'uniqueCount' | 'unique';
  aggregatedCell?: (info) => ReactNode;
  sparkline?: {
    type: 'line' | 'bar' | 'area' | 'winLoss';
    valueAccessor: (row: T) => number[];
    color?: string | ((vals: number[]) => string);
    thresholds?: { positive?: string; negative?: string }; // winLoss
    showTooltip?: boolean;   // default true
    height?: number;
    width?: number;
  };
  cellClassRules?: Record<string, (value: unknown, row: T) => boolean>;
};
```

## Props

```ts
<DataGrid<T>
  columns
  rows
  getRowId?
  loading?  error?
  selection?={ mode: 'single' | 'multi' }
  pagination?={ pageSize, pageSizeOptions } | false

  // Toggle features
  enableMultiSort?         enableColumnResizing?      enableColumnReorder?
  enableColumnPinning?     enableDragToGroup?         enableGrouping?
  enableVirtualization?    enableKeyboardNavigation?  enableRangeSelection?
  enableClipboardCopy?     enableStatusBar?           enableCharts?
  enableExcelExport?       enablePivot?               enableCsvExport?

  // Export
  csvFileName?  excelFileName?

  // Master-detail
  renderDetailPanel?={ (row: T) => ReactNode }

  // Pinned totals
  pinnedRowsTop?  pinnedRowsBottom?

  // State (uncontrolled-with-onChange or fully controlled)
  initialState?    state?    onStateChange?

  // Slots
  slots?={ loadingOverlay, noRowsOverlay, errorOverlay, toolbarExtras }
  density?
  height?
  className?
/>
```

## Extension points

- **Server-side mode** is intentionally not wired in v2, but the API is shaped to accept it. `useDataGridState` already emits `onStateChange` with the full state shape. A future pass adds a `serverSide={{ fetchRows }}` prop that flips `manualPagination`/`manualSorting`/`manualFiltering` and routes state into the fetcher — no consumer-facing breaking change.
- **Custom sparkline engine** — set `meta.sparkline.engine = 'echarts'` to switch a row's sparkline from the built-in SVG renderer to a lazy-loaded echarts instance (heavier; only worth it for very rich sparkline types).
- **Custom cells / headers** — pass any `cell` / `header` function through TanStack's `ColumnDef`.
- **Custom filter functions** — supply a per-column `filterFn`. Built-in `'set'` variant attaches an `inList` filter automatically.

## Caveats

- Charts render as modal dialogs, so pop-up blockers are not an issue.
- Server-side grouping / pivoting / lazy-load is out of scope for v2 (everything is computed client-side; perf is fine for ~50k rows with virtualization on).
- Editing is out of scope by design — this grid is read-only.

## Dev

```sh
npm install
npm run dev       # demo at http://localhost:5173
npm run build     # library build (dist/)
npm run typecheck
```

Library entry: `src/index.ts`. Vite library config: `vite.config.ts`. Demo lives in `demo/`.
