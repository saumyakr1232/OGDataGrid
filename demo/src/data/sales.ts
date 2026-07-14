import type { DataGridConfig } from 'og-data-grid';

export interface Sale {
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

function rnd<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

/** Deterministic row generator so every mount produces identical data. */
export function genRows(n: number): Sale[] {
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

// Tabs unmount on switch; cache per-size so the 50k set is generated only once.
const salesCache = new Map<number, Sale[]>();

export function getSales(n: number): Sale[] {
  let rows = salesCache.get(n);
  if (!rows) {
    rows = genRows(n);
    salesCache.set(n, rows);
  }
  return rows;
}

/** Rows with holes (null rep / unitPrice on every 3rd row) for the emptyText demo. */
export type SaleWithGaps = Omit<Sale, 'rep' | 'unitPrice'> & {
  rep: string | null;
  unitPrice: number | null;
};

let gapsCache: SaleWithGaps[] | null = null;

export function getSalesWithGaps(n: number): SaleWithGaps[] {
  if (!gapsCache || gapsCache.length !== n) {
    gapsCache = genRows(n).map((r, i) =>
      i % 3 === 0 ? { ...r, rep: null, unitPrice: null } : r,
    );
  }
  return gapsCache;
}

/**
 * A serializable column layout, as it might be persisted in a DB — plain JSON,
 * no functions. Shows formats, chips, styleRules, and a merged column.
 */
export const SAVED_LAYOUT = `{
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

/** The saved layout, parsed once at module scope. */
export const SAVED_CONFIG = JSON.parse(SAVED_LAYOUT) as DataGridConfig;
