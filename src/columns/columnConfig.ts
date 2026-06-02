import { createElement, type ReactNode } from 'react';
import { renderChip, resolveCellStyleSpec } from './cellStyle';
import type {
  AggregationFn,
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

/** Serializable visual styling for a cell. */
export interface CellStyle {
  /**
   * How the value is presented. `'text'` (default) styles the cell text in
   * place; `'chip'` renders the value inside a rounded pill using
   * `backgroundColor`/`textColor` (with a subtle default background).
   */
  variant?: 'text' | 'chip';
  /** CSS color applied to the text. */
  textColor?: string;
  /** CSS background color applied to the cell (or chip, for the `chip` variant). */
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

/** A conditional style: when `op` matches the cell's own value, apply `style`. */
export interface StyleRule {
  op: StyleConditionOp;
  value?: SerializableValue;
  /** Upper bound for the `between` operator. */
  value2?: SerializableValue;
  style: CellStyle;
}

/**
 * Merge several source row fields into one synthetic column. The merged value is
 * each source field, formatted by its own column's `format`/`formatOptions`,
 * joined by `separator`.
 */
export interface MergeConfig {
  /** Source row fields, in display order (dotted paths supported). */
  fields: string[];
  /** Inserted between parts. Defaults to a single space. */
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
  /** Allow grouping by this column. */
  groupable?: boolean;
  /** Aggregation used when rows are grouped. */
  aggregation?: AggregationFn;
  /** How to render the cell value. */
  format?: ColumnFormat;
  formatOptions?: ColumnFormatOptions;
  /**
   * Merge several source fields into this synthetic column. When set, `field`
   * is the column's id/key (e.g. "grouped_col1+2") rather than a row accessor.
   */
  merge?: MergeConfig;
  /** Static style applied to every cell of this column. */
  cellStyle?: CellStyle;
  /** Conditional styles evaluated against the cell value; later matches win. */
  styleRules?: StyleRule[];
}

export interface ColumnSortConfig {
  field: string;
  desc?: boolean;
}

/** The serializable object accepted by the `columns` prop. */
export interface DataGridConfig {
  columns: ColumnConfig[];
  /** Field ids to group by initially. */
  groupBy?: string[];
  /** Initial multi-sort. */
  sorting?: ColumnSortConfig[];
}

/** Type guard: distinguishes the serializable config from a column-def array. */
export function isDataGridConfig<T>(
  columns: DataGridColumnDef<T>[] | DataGridConfig | undefined,
): columns is DataGridConfig {
  return !!columns && !Array.isArray(columns) && Array.isArray((columns as DataGridConfig).columns);
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
      const d = value instanceof Date ? value : new Date(value as string | number);
      return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString(locale);
    }
    case 'datetime': {
      const d = value instanceof Date ? value : new Date(value as string | number);
      return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString(locale);
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

/** Read a (possibly dotted) path off a row object, e.g. "address.city". */
function getByPath(obj: unknown, path: string): unknown {
  if (obj == null) return undefined;
  if (!path.includes('.')) return (obj as Record<string, unknown>)[path];
  return path
    .split('.')
    .reduce<unknown>((acc, key) => (acc == null ? acc : (acc as Record<string, unknown>)[key]), obj);
}

/** Format a single source value as plain text per a source column's config. */
function formatPart(value: unknown, src?: ColumnConfig): string {
  if (src?.format) return String(formatCellValue(value, src.format, src.formatOptions));
  if (value == null) return '';
  return String(value);
}

/** Build the cell renderer for a merged column (declared via `c.merge`). */
function mergedCellRenderer<T>(
  c: ColumnConfig,
  lookup: Map<string, ColumnConfig>,
): (info: { row: { original: T } }) => ReactNode {
  const fields = c.merge!.fields;
  const separator = c.merge!.separator ?? ' ';
  // When the merged column declares its own styling, the whole cell is styled by
  // the meta path in DataRow, so render the joined text plainly here. Otherwise
  // each part keeps its source column's styling, rendered as styled spans.
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

/** Build a TanStack column def from one serializable column config. */
function configToColumnDef<T>(
  c: ColumnConfig,
  lookup: Map<string, ColumnConfig>,
): DataGridColumnDef<T> {
  const meta: DataGridColumnMeta<T> = {};
  if (c.align) meta.align = c.align;
  if (c.groupable) meta.groupable = c.groupable;
  if (c.aggregation) meta.aggregationFn = c.aggregation;
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
    // A merged column has no row accessor; its joined string (each part formatted
    // by its source column) drives display, sort, filter, search and CSV.
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
 * initial state it implies (hidden columns → visibility, groupBy → grouping,
 * sorting → sorting). The caller merges this initial state under any
 * consumer-supplied `initialState`.
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
  if (config.groupBy && config.groupBy.length > 0) {
    initialState.grouping = [...config.groupBy];
  }
  if (config.sorting && config.sorting.length > 0) {
    initialState.sorting = config.sorting.map((s) => ({ id: s.field, desc: !!s.desc }));
  }

  return { columns, initialState };
}
