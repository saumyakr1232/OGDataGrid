import type { DataGridColumnDef, FilterVariant } from '../types';

export interface InferredFilter {
  variant: FilterVariant;
  /** Derived choices for a `select` variant (sorted, de-duplicated). */
  options?: { label: string; value: unknown }[];
}

export interface InferOptions {
  /** How many data points to sample for the *type* decision. Defaults to 100. */
  sampleSize?: number;
  /** Max distinct string values before a column is treated as free text. */
  maxDistinct?: number;
  /** Injectable RNG (defaults to Math.random) so callers/tests can seed it. */
  random?: () => number;
}

const DEFAULT_SAMPLE_SIZE = 100;
const DEFAULT_MAX_DISTINCT = 20;

/** Read a column's value out of a row via accessorFn or (possibly dotted) accessorKey. */
export function makeAccessor<T>(column: DataGridColumnDef<T>): ((row: T, index: number) => unknown) | null {
  const withFn = column as { accessorFn?: (row: T, index: number) => unknown };
  if (typeof withFn.accessorFn === 'function') return withFn.accessorFn;

  const key = (column as { accessorKey?: string | number }).accessorKey;
  if (key == null) return null;
  const path = String(key).split('.');
  return (row: T) => {
    let cur: unknown = row;
    for (const seg of path) {
      if (cur == null) return undefined;
      cur = (cur as Record<string, unknown>)[seg];
    }
    return cur;
  };
}

/**
 * Pick up to `count` unique indices in [0, n) at random. When the dataset is no
 * larger than `count`, every index is returned. Sampling at random (rather than
 * taking the head) avoids bias when the source data arrives pre-sorted.
 */
export function sampleIndices(n: number, count: number, random: () => number): number[] {
  if (n <= 0) return [];
  if (n <= count) return Array.from({ length: n }, (_, i) => i);
  const picked = new Set<number>();
  let guard = count * 10; // avoid pathological loops if RNG is degenerate
  while (picked.size < count && guard-- > 0) {
    picked.add(Math.floor(random() * n));
  }
  return [...picked];
}

function isDateLike(v: unknown): boolean {
  if (v instanceof Date) return !Number.isNaN(v.getTime());
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return !Number.isNaN(Date.parse(v));
  return false;
}

/** Classify a set of already-extracted, non-null sample values. */
export function classifyValues(
  values: unknown[],
  maxDistinct = DEFAULT_MAX_DISTINCT,
): InferredFilter {
  if (values.length === 0) return { variant: 'text' };

  const every = (pred: (v: unknown) => boolean) => values.every(pred);

  if (every((v) => typeof v === 'boolean')) return { variant: 'boolean' };
  if (every((v) => typeof v === 'number' && Number.isFinite(v))) return { variant: 'number' };
  if (every(isDateLike)) return { variant: 'date' };

  if (every((v) => typeof v === 'string')) {
    const distinct = [...new Set(values as string[])];
    // Low-cardinality strings → a dropdown is more useful than a text box.
    if (distinct.length <= maxDistinct && distinct.length < values.length * 0.6) {
      return {
        variant: 'select',
        options: distinct
          .sort((a, b) => a.localeCompare(b))
          .map((v) => ({ label: v, value: v })),
      };
    }
  }

  return { variant: 'text' };
}

/**
 * Walk *every* row to build the complete distinct set of a string column,
 * bailing out early as soon as the count exceeds `maxDistinct` — so a
 * high-cardinality / free-text column stops almost immediately and we never pay
 * for a full scan there. Returns `null` (→ treat as free text) when the column
 * is a poor `select` candidate: a non-string value appears, the distinct count
 * blows past the cap, or there isn't enough repetition to be worth a dropdown.
 *
 * Unlike sampling, this guarantees the option list contains *all* real values,
 * which matters for skewed data where a sample would miss rare categories.
 */
function collectDistinct<T>(
  accessor: (row: T, index: number) => unknown,
  rows: T[],
  maxDistinct: number,
): string[] | null {
  const distinct = new Set<string>();
  let nonEmpty = 0;
  for (let i = 0; i < rows.length; i++) {
    const v = accessor(rows[i], i);
    if (v == null || v === '') continue;
    if (typeof v !== 'string') return null; // mixed/non-string → not a select
    nonEmpty++;
    distinct.add(v);
    if (distinct.size > maxDistinct) return null; // too many → free text (early bail)
  }
  if (distinct.size === 0) return null;
  // An (almost) all-unique column is really free text, not a dropdown.
  if (distinct.size >= nonEmpty * 0.6) return null;
  return [...distinct];
}

/**
 * Infer a filter variant (and, for `select`, its options) for a column.
 *
 * Hybrid strategy:
 *  - The *type* (boolean/number/date) is decided from a random sample — cheap,
 *    and a column's type is uniform enough that a sample rarely misleads. (A
 *    stray off-type value that slips past the sample still degrades gracefully:
 *    e.g. numberRangeFilterFn simply rejects non-numbers.)
 *  - For string columns the cardinality is decided by a *full* scan with early
 *    bail (collectDistinct), because sampling under-counts distinct values on
 *    skewed data and would otherwise emit an incomplete `select` dropdown.
 *
 * Returns `null` when the column has no accessor (e.g. a display/action column)
 * or no non-null data to learn from.
 */
export function inferColumnFilter<T>(
  column: DataGridColumnDef<T>,
  rows: T[],
  opts: InferOptions = {},
): InferredFilter | null {
  const accessor = makeAccessor(column);
  if (!accessor) return null;

  const sampleSize = opts.sampleSize ?? DEFAULT_SAMPLE_SIZE;
  const maxDistinct = opts.maxDistinct ?? DEFAULT_MAX_DISTINCT;
  const random = opts.random ?? Math.random;

  // 1) Sample for the type decision.
  const idx = sampleIndices(rows.length, sampleSize, random);
  const sample: unknown[] = [];
  for (const i of idx) {
    const v = accessor(rows[i], i);
    if (v != null && v !== '') sample.push(v);
  }
  if (sample.length === 0) return null;

  const sampled = classifyValues(sample, maxDistinct);
  if (sampled.variant === 'boolean' || sampled.variant === 'number' || sampled.variant === 'date') {
    return { variant: sampled.variant };
  }

  // 2) String-ish column: derive the complete option list from a full scan so
  //    skew can't hide rare values; fall back to free text when unsuitable.
  const distinct = collectDistinct(accessor, rows, maxDistinct);
  if (!distinct) return { variant: 'text' };
  return {
    variant: 'select',
    options: distinct.sort((a, b) => a.localeCompare(b)).map((v) => ({ label: v, value: v })),
  };
}
