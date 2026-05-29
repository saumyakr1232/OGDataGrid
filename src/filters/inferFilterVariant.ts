import type { DataGridColumnDef, FilterVariant } from '../types';

export interface InferredFilter {
  variant: FilterVariant;
  /** Derived choices for a `select` variant (sorted, de-duplicated). */
  options?: { label: string; value: unknown }[];
}

export interface InferOptions {
  /** How many data points to sample. Defaults to 100. */
  sampleSize?: number;
  /** Max distinct string values before a column is treated as free text. */
  maxDistinct?: number;
  /** Injectable RNG (defaults to Math.random) so callers/tests can seed it. */
  random?: () => number;
}

const DEFAULT_SAMPLE_SIZE = 100;
const DEFAULT_MAX_DISTINCT = 20;

/** Read a column's value out of a row via accessorFn or (possibly dotted) accessorKey. */
function makeAccessor<T>(column: DataGridColumnDef<T>): ((row: T, index: number) => unknown) | null {
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
 * Infer a filter variant (and, for `select`, its options) for a column by
 * sampling the provided rows at random. Returns `null` when the column has no
 * accessor (e.g. a display/action column) or no non-null data to learn from.
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

  const idx = sampleIndices(rows.length, sampleSize, random);
  const values: unknown[] = [];
  for (const i of idx) {
    const v = accessor(rows[i], i);
    if (v != null && v !== '') values.push(v);
  }
  if (values.length === 0) return null;

  return classifyValues(values, maxDistinct);
}
