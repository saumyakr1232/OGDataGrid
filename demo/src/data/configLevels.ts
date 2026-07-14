/**
 * Data + a minimal→full progression of JSON `DataGridConfig` for the "JSON
 * config" tab. A small explicit dataset (8 rows) so the whole thing — data and
 * config — is visible as copy-pasteable code next to the rendered grid.
 */

export interface SampleRow {
  id: string;
  date: string; // ISO yyyy-mm-dd — JSON-friendly, formatted by a `date` column
  region: 'North' | 'South' | 'East' | 'West';
  category: 'Hardware' | 'Software' | 'Services';
  product: string;
  rep: string;
  units: number;
  unitPrice: number;
  revenue: number;
  active: boolean;
}

export const SAMPLE_ROWS: SampleRow[] = [
  { id: 's1', date: '2024-01-05', region: 'North', category: 'Hardware', product: 'Widget Pro', rep: 'Ada', units: 42, unitPrice: 299, revenue: 12558, active: true },
  { id: 's2', date: '2024-01-18', region: 'South', category: 'Software', product: 'Gizmo', rep: 'Linus', units: 8, unitPrice: 149, revenue: 1192, active: false },
  { id: 's3', date: '2024-02-02', region: 'East', category: 'Services', product: 'Cog', rep: 'Grace', units: 25, unitPrice: 89, revenue: 2225, active: true },
  { id: 's4', date: '2024-02-21', region: 'West', category: 'Hardware', product: 'Sprocket', rep: 'Alan', units: 60, unitPrice: 45, revenue: 2700, active: true },
  { id: 's5', date: '2024-03-09', region: 'North', category: 'Software', product: 'Bolt Kit', rep: 'Hedy', units: 15, unitPrice: 210, revenue: 3150, active: false },
  { id: 's6', date: '2024-03-27', region: 'South', category: 'Services', product: 'Linchpin', rep: 'Ken', units: 3, unitPrice: 260, revenue: 780, active: true },
  { id: 's7', date: '2024-04-14', region: 'East', category: 'Hardware', product: 'Hinge', rep: 'Ada', units: 48, unitPrice: 120, revenue: 5760, active: true },
  { id: 's8', date: '2024-05-01', region: 'West', category: 'Software', product: 'Casing', rep: 'Grace', units: 33, unitPrice: 175, revenue: 5775, active: false },
];

/** The sample data, pretty-printed for the "Data" code panel. */
export const SAMPLE_ROWS_JSON = JSON.stringify(SAMPLE_ROWS, null, 2);

export interface ConfigLevel {
  /** Short label for the stepper. */
  label: string;
  /** One-line summary shown under the stepper. */
  blurb: string;
  /** What this step adds over the previous one. */
  whatsNew: string;
  /** The `columns` config as a JSON string, or null for the no-config (auto) case. */
  config: string | null;
  /** Whether to open the inline column-filter row (so filter variants are visible). */
  showFilters?: boolean;
}

export const CONFIG_LEVELS: ConfigLevel[] = [
  {
    label: 'Minimal',
    blurb: 'Pass only rows — columns, headers and filter types are inferred from the data.',
    whatsNew: 'No columns config at all: `<DataGrid rows={data} />`.',
    config: null,
  },
  {
    label: 'Pick columns',
    blurb: 'Choose which fields to show, and in what order. Headers are auto-humanized.',
    whatsNew: 'A `columns` array of `{ field }` — the grid shows just these, left to right.',
    config: `{
  "columns": [
    { "field": "product" },
    { "field": "region" },
    { "field": "rep" },
    { "field": "units" },
    { "field": "revenue" }
  ]
}`,
  },
  {
    label: 'Headers & layout',
    blurb: 'Custom header text, fixed pixel widths, and per-column alignment.',
    whatsNew: '`header`, `width`, and `align` on each column.',
    config: `{
  "columns": [
    { "field": "product", "header": "Product", "width": 170 },
    { "field": "region", "header": "Region" },
    { "field": "rep", "header": "Sales Rep" },
    { "field": "units", "header": "Units", "align": "right", "width": 90 },
    { "field": "revenue", "header": "Revenue", "align": "right" }
  ]
}`,
  },
  {
    label: 'Formatting',
    blurb: 'Declarative value formatting — no render functions needed.',
    whatsNew: '`format` (date, number, currency, boolean) plus `formatOptions`.',
    config: `{
  "columns": [
    { "field": "date", "header": "Date", "format": "date", "width": 120 },
    { "field": "product", "header": "Product", "width": 170 },
    { "field": "region", "header": "Region" },
    { "field": "units", "header": "Units", "align": "right", "width": 90, "format": "number" },
    { "field": "unitPrice", "header": "Unit Price", "align": "right", "format": "currency", "formatOptions": { "currency": "USD" } },
    { "field": "revenue", "header": "Revenue", "align": "right", "format": "currency", "formatOptions": { "currency": "USD", "maximumFractionDigits": 0 } },
    { "field": "active", "header": "Active", "format": "boolean" }
  ]
}`,
  },
  {
    label: 'Filter & sort',
    blurb: 'Pick the filter control per column and set an initial sort.',
    whatsNew: '`filter: { variant }` (date/text/select/number/boolean) and top-level `sorting`.',
    showFilters: true,
    config: `{
  "columns": [
    { "field": "date", "header": "Date", "format": "date", "width": 120, "filter": { "variant": "date" } },
    { "field": "product", "header": "Product", "width": 170, "filter": { "variant": "text" } },
    { "field": "region", "header": "Region", "filter": { "variant": "select" } },
    { "field": "units", "header": "Units", "align": "right", "width": 90, "format": "number", "filter": { "variant": "number" } },
    { "field": "unitPrice", "header": "Unit Price", "align": "right", "format": "currency", "formatOptions": { "currency": "USD" } },
    { "field": "revenue", "header": "Revenue", "align": "right", "format": "currency", "formatOptions": { "currency": "USD", "maximumFractionDigits": 0 } },
    { "field": "active", "header": "Active", "format": "boolean", "filter": { "variant": "boolean" } }
  ],
  "sorting": [{ "field": "revenue", "desc": true }]
}`,
  },
  {
    label: 'Full',
    blurb: 'Conditional styling (chips, colors, thresholds) and a merged column.',
    whatsNew: '`cellStyle`, `styleRules` (chip variant + value thresholds), and a `merge` column.',
    showFilters: true,
    config: `{
  "columns": [
    { "field": "date", "header": "Date", "format": "date", "width": 120, "filter": { "variant": "date" } },
    {
      "field": "regionProduct",
      "header": "Region / Product",
      "width": 190,
      "merge": { "fields": ["region", "product"], "separator": " — " }
    },
    {
      "field": "region",
      "header": "Region",
      "filter": { "variant": "select" },
      "styleRules": [
        { "op": "equals", "value": "North", "style": { "variant": "chip", "backgroundColor": "#e3f2fd", "textColor": "#1565c0", "fontWeight": "bold" } },
        { "op": "equals", "value": "South", "style": { "variant": "chip", "backgroundColor": "#fff3e0", "textColor": "#ef6c00" } },
        { "op": "equals", "value": "East", "style": { "variant": "chip", "backgroundColor": "#e0f2f1", "textColor": "#00897b" } },
        { "op": "equals", "value": "West", "style": { "variant": "chip", "backgroundColor": "#f3e5f5", "textColor": "#6a1b9a" } }
      ]
    },
    {
      "field": "units",
      "header": "Units",
      "align": "right",
      "width": 90,
      "format": "number",
      "styleRules": [
        { "op": "lt", "value": 10, "style": { "textColor": "#9e9e9e", "fontStyle": "italic" } },
        { "op": "gte", "value": 40, "style": { "textColor": "#2e7d32", "fontWeight": "bold" } }
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
}`,
  },
];
