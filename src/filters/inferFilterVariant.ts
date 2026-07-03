import type { DataGridColumnDef, FilterVariant } from '../types';

export interface InferredFilter {
  variant: FilterVariant;
  options?: { label: string; value: unknown }[];
}

export interface InferOptions {
  /** Sample size for the type decision. Defaults to 100. */
  sampleSize?: number;
  /** Max distinct string values before a column is treated as free text. */
  maxDistinct?: number;
  /** Injectable RNG for tests. */
  random?: () => number;
}

const DEFAULT_SAMPLE_SIZE = 100;
const DEFAULT_MAX_DISTINCT = 20;

/** Read a column's value via accessorFn or (possibly dotted) accessorKey. */
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

// Random rather than head sampling, so pre-sorted data doesn't bias the guess.
export function sampleIndices(n: number, count: number, random: () => number): number[] {
  if (n <= 0) return [];
  if (n <= count) return Array.from({ length: n }, (_, i) => i);
  const picked = new Set<number>();
  let guard = count * 10; // bail if the RNG is degenerate
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
    // Low-cardinality strings get a dropdown instead of a text box.
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

// Full scan (with early bail once past maxDistinct) so the option list can't
// miss rare values the way a sample would. Returns null when the column isn't
// a good select candidate.
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
    if (typeof v !== 'string') return null;
    nonEmpty++;
    distinct.add(v);
    if (distinct.size > maxDistinct) return null;
  }
  if (distinct.size === 0) return null;
  // Mostly-unique values means free text, not a dropdown.
  if (distinct.size >= nonEmpty * 0.6) return null;
  return [...distinct];
}

/**
 * Infer a filter variant for a column. The type is decided from a random
 * sample; string cardinality uses a full scan so skewed data can't produce an
 * incomplete select dropdown. Returns null when there's nothing to learn from.
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

  const distinct = collectDistinct(accessor, rows, maxDistinct);
  if (!distinct) return { variant: 'text' };
  return {
    variant: 'select',
    options: distinct.sort((a, b) => a.localeCompare(b)).map((v) => ({ label: v, value: v })),
  };
}
