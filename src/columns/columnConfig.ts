import { createElement, type ReactNode } from 'react';
import { renderChip, resolveCellStyleSpec } from './cellStyle';
import type {
  DataGridColumnDef,
  DataGridColumnMeta,
  DataGridState,
  FilterVariant,
} from '../types';
import { humanizeKey } from './generateColumns';

/**
 * Serializable, DB-storable column configuration.
 *
 * Unlike `DataGridColumnDef` (which carries functions — cell renderers,
 * accessors, filter fns — and cannot be JSON-stringified), every field here is
 * a primitive, enum, array, or plain object. A whole `DataGridConfig` survives
 * `JSON.stringify` → store → `JSON.parse` → pass back to `<DataGrid columns>`.
 *
 * Cell rendering for non-trivial values is expressed declaratively via `format`
 * (resolved to a built-in formatter at runtime) rather than a function.
 */

/** Primitive cell value type — what a filter option may carry, kept serializable. */
export type SerializableValue = string | number | boolean;

export type ColumnFormat =
  | 'text'
  | 'number'
  | 'currency'
  | 'percent'
  | 'date'
  | 'datetime'
  | 'boolean';

export interface ColumnFormatOptions {
  /** BCP-47 locale for Intl formatting (e.g. "en-US"). */
  locale?: string;
  /** ISO 4217 currency code for `currency` format (default "USD"). */
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  /** Labels for the `boolean` format, as [whenTrue, whenFalse]. Default ["Yes","No"]. */
  booleanLabels?: [string, string];
}

export interface ColumnFilterConfig {
  variant?: FilterVariant;
  options?: { label: string; value: SerializableValue }[];
}

export interface CellStyle {
  /** `'chip'` renders the value as a rounded pill; defaults to plain text. */
  variant?: 'text' | 'chip';
  textColor?: string;
  backgroundColor?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
}

export type StyleConditionOp =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'isEmpty'
  | 'isNotEmpty';

/** Applies `style` when `op` matches the cell value. */
export interface StyleRule {
  op: StyleConditionOp;
  value?: SerializableValue;
  value2?: SerializableValue;
  style: CellStyle;
}

/** Combines several fields into one column, each formatted by its own column. */
export interface MergeConfig {
  fields: string[];
  /** Defaults to a single space. */
  separator?: string;
}

export interface ColumnConfig {
  /** Row key this column reads (supports dotted paths, e.g. "address.city"). */
  field: string;
  /** Header text. Defaults to a humanized `field`. */
  header?: string;
  /** Fixed pixel width. */
  width?: number;
  align?: 'left' | 'right' | 'center';
  /** Hide the column by default (user can re-show it via the Columns menu). */
  hidden?: boolean;
  /** `false` disables filtering; an object configures the filter UI. */
  filter?: ColumnFilterConfig | false;
  /** `false` disables sorting on this column. */
  sortable?: boolean;
  /** How to render the cell value. */
  format?: ColumnFormat;
  formatOptions?: ColumnFormatOptions;
  /** When set, `field` is the column id/key rather than a row accessor. */
  merge?: MergeConfig;
  cellStyle?: CellStyle;
  styleRules?: StyleRule[];
}

export interface ColumnSortConfig {
  field: string;
  desc?: boolean;
}

/** The serializable object accepted by the `columns` prop. */
export interface DataGridConfig {
  columns: ColumnConfig[];
  /** Initial multi-sort. */
  sorting?: ColumnSortConfig[];
}

/** Type guard: distinguishes the serializable config from a column-def array. */
export function isDataGridConfig<T>(
  columns: DataGridColumnDef<T>[] | DataGridConfig | undefined,
): columns is DataGridConfig {
  return !!columns && !Array.isArray(columns) && Array.isArray((columns as DataGridConfig).columns);
}

/**
 * Parse a cell value to a Date for display. A bare `yyyy-mm-dd` string is built
 * in local time rather than via `new Date(str)` (which parses date-only strings
 * as UTC midnight and so renders the previous day in any negative-UTC zone).
 */
function parseDateValue(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  return null;
}

/** Format a single cell value per the declarative `format` (returns plain text). */
export function formatCellValue(
  value: unknown,
  format: ColumnFormat,
  opts: ColumnFormatOptions = {},
): ReactNode {
  if (value == null || value === '') return '';
  const { locale, minimumFractionDigits, maximumFractionDigits } = opts;
  const numberOpts = { minimumFractionDigits, maximumFractionDigits };

  switch (format) {
    case 'number':
      return Number.isNaN(Number(value))
        ? String(value)
        : new Intl.NumberFormat(locale, numberOpts).format(Number(value));
    case 'currency':
      return Number.isNaN(Number(value))
        ? String(value)
        : new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: opts.currency ?? 'USD',
            ...numberOpts,
          }).format(Number(value));
    case 'percent':
      return Number.isNaN(Number(value))
        ? String(value)
        : new Intl.NumberFormat(locale, { style: 'percent', ...numberOpts }).format(Number(value));
    case 'date': {
      const d = parseDateValue(value);
      return d == null || Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString(locale);
    }
    case 'datetime': {
      const d = parseDateValue(value);
      return d == null || Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString(locale);
    }
    case 'boolean': {
      const [whenTrue, whenFalse] = opts.booleanLabels ?? ['Yes', 'No'];
      return value ? whenTrue : whenFalse;
    }
    case 'text':
    default:
      return String(value);
  }
}

function getByPath(obj: unknown, path: string): unknown {
  if (obj == null) return undefined;
  if (!path.includes('.')) return (obj as Record<string, unknown>)[path];
  return path
    .split('.')
    .reduce<unknown>((acc, key) => (acc == null ? acc : (acc as Record<string, unknown>)[key]), obj);
}

function formatPart(value: unknown, src?: ColumnConfig): string {
  if (src?.format) return String(formatCellValue(value, src.format, src.formatOptions));
  if (value == null) return '';
  return String(value);
}

function mergedCellRenderer<T>(
  c: ColumnConfig,
  lookup: Map<string, ColumnConfig>,
): (info: { row: { original: T } }) => ReactNode {
  const fields = c.merge!.fields;
  const separator = c.merge!.separator ?? ' ';
  // with its own style the whole cell is styled in DataRow, so just join text here.
  // otherwise each part carries its source column's style as a span.
  const ownStyling = !!c.cellStyle || (!!c.styleRules && c.styleRules.length > 0);

  return ({ row }) => {
    const original = row.original as Record<string, unknown>;
    if (ownStyling) {
      return fields.map((f) => formatPart(getByPath(original, f), lookup.get(f))).join(separator);
    }
    return fields.flatMap((f, i) => {
      const src = lookup.get(f);
      const raw = getByPath(original, f);
      const text = formatPart(raw, src);
      const spec = resolveCellStyleSpec(raw, src?.cellStyle, src?.styleRules);
      const part =
        spec?.variant === 'chip'
          ? renderChip(text, spec.css, f)
          : createElement('span', { key: f, style: spec?.css }, text);
      return i === 0 ? [part] : [separator, part];
    });
  };
}

function configToColumnDef<T>(
  c: ColumnConfig,
  lookup: Map<string, ColumnConfig>,
): DataGridColumnDef<T> {
  const meta: DataGridColumnMeta<T> = {};
  if (c.align) meta.align = c.align;
  if (c.filter && typeof c.filter === 'object') {
    if (c.filter.variant) meta.filterVariant = c.filter.variant;
    if (c.filter.options) meta.filterOptions = c.filter.options;
  }
  if (c.cellStyle) meta.cellStyle = c.cellStyle;
  if (c.styleRules && c.styleRules.length > 0) meta.styleRules = c.styleRules;

  const def: Record<string, unknown> = {
    header: c.header ?? humanizeKey(c.field),
  };

  if (c.merge) {
    // no row accessor — the joined string drives display, sort, filter and CSV
    const fields = c.merge.fields;
    const separator = c.merge.separator ?? ' ';
    def.id = c.field;
    def.accessorFn = (row: T) =>
      fields.map((f) => formatPart(getByPath(row, f), lookup.get(f))).join(separator);
    def.cell = mergedCellRenderer<T>(c, lookup);
  } else {
    def.accessorKey = c.field;
    if (c.format) {
      const { format, formatOptions } = c;
      def.cell = (info: { getValue: () => unknown }) =>
        formatCellValue(info.getValue(), format, formatOptions);
    }
  }

  if (c.width != null) def.size = c.width;
  if (c.sortable === false) def.enableSorting = false;
  if (c.filter === false) def.enableColumnFilter = false;
  if (Object.keys(meta).length > 0) def.meta = meta;

  return def as unknown as DataGridColumnDef<T>;
}

/**
 * Resolve a serializable `DataGridConfig` into runtime column defs plus the
 * initial state it implies (hidden columns → visibility, sorting → sorting).
 * The caller merges this initial state under any consumer-supplied
 * `initialState`.
 */
export function resolveDataGridConfig<T>(config: DataGridConfig): {
  columns: DataGridColumnDef<T>[];
  initialState: Partial<DataGridState>;
} {
  const lookup = new Map(config.columns.map((c) => [c.field, c]));
  const columns = config.columns.map((c) => configToColumnDef<T>(c, lookup));

  const initialState: Partial<DataGridState> = {};

  const hidden = config.columns.filter((c) => c.hidden).map((c) => c.field);
  if (hidden.length > 0) {
    initialState.columnVisibility = Object.fromEntries(hidden.map((f) => [f, false]));
  }
  if (config.sorting && config.sorting.length > 0) {
    initialState.sorting = config.sorting.map((s) => ({ id: s.field, desc: !!s.desc }));
  }

  return { columns, initialState };
}
