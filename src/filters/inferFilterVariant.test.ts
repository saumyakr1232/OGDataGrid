import { describe, it, expect } from 'vitest';
import {
  classifyValues,
  inferColumnFilter,
  sampleIndices,
} from './inferFilterVariant';
import type { DataGridColumnDef } from '../types';

// Deterministic RNG (mulberry32) so the sampling tests are reproducible.
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('sampleIndices', () => {
  it('returns nothing for an empty dataset', () => {
    expect(sampleIndices(0, 100, seeded(1))).toEqual([]);
  });

  it('returns every index when the dataset is no larger than the sample size', () => {
    expect(sampleIndices(5, 100, seeded(1))).toEqual([0, 1, 2, 3, 4]);
  });

  it('picks exactly `count` unique indices, all in range, when oversized', () => {
    const idx = sampleIndices(1000, 100, seeded(42));
    expect(idx).toHaveLength(100);
    expect(new Set(idx).size).toBe(100); // unique
    expect(idx.every((i) => i >= 0 && i < 1000)).toBe(true);
  });

  it('is deterministic for a given seed', () => {
    expect(sampleIndices(1000, 50, seeded(7))).toEqual(sampleIndices(1000, 50, seeded(7)));
  });
});

describe('classifyValues', () => {
  it('defaults to text when there is nothing to learn from', () => {
    expect(classifyValues([])).toEqual({ variant: 'text' });
  });

  it('detects booleans', () => {
    expect(classifyValues([true, false, true])).toEqual({ variant: 'boolean' });
  });

  it('detects finite numbers', () => {
    expect(classifyValues([1, 2, 3.5, -7])).toEqual({ variant: 'number' });
  });

  it('does not treat NaN/Infinity as a number column', () => {
    expect(classifyValues([1, Number.NaN]).variant).toBe('text');
    expect(classifyValues([1, Infinity]).variant).toBe('text');
  });

  it('detects Date objects', () => {
    expect(classifyValues([new Date('2024-01-01'), new Date('2024-02-01')])).toEqual({
      variant: 'date',
    });
  });

  it('detects ISO date strings', () => {
    expect(classifyValues(['2024-01-01', '2024-06-15', '2023-12-31'])).toEqual({
      variant: 'date',
    });
  });

  it('treats low-cardinality strings as a sorted select', () => {
    const result = classifyValues(['South', 'North', 'North', 'East', 'South', 'East', 'North', 'East']);
    expect(result.variant).toBe('select');
    expect(result.options).toEqual([
      { label: 'East', value: 'East' },
      { label: 'North', value: 'North' },
      { label: 'South', value: 'South' },
    ]);
  });

  it('treats high-cardinality strings as free text', () => {
    const values = Array.from({ length: 50 }, (_, i) => `unique-${i}`);
    expect(classifyValues(values).variant).toBe('text');
  });

  it('respects a custom maxDistinct threshold', () => {
    const values = ['a', 'b', 'c', 'd', 'a', 'b', 'c', 'd'];
    // 4 distinct out of 8 → select by default…
    expect(classifyValues(values).variant).toBe('select');
    // …but text once the distinct cap is lowered below the variety.
    expect(classifyValues(values, 3).variant).toBe('text');
  });

  it('falls back to text for mixed types', () => {
    expect(classifyValues([1, 'two', true]).variant).toBe('text');
  });
});

describe('inferColumnFilter', () => {
  interface Row {
    name: string;
    age: number;
    nested: { city: string };
  }

  const cities = ['NYC', 'LA', 'NYC', 'LA', 'NYC', 'LA', 'NYC', 'LA', 'NYC', 'LA'];
  const rows: Row[] = cities.map((city, i) => ({
    name: `Person ${i}`,
    age: 20 + i,
    nested: { city },
  }));

  it('reads values via a plain accessorKey', () => {
    const col = { accessorKey: 'age', header: 'Age' } as DataGridColumnDef<Row>;
    expect(inferColumnFilter(col, rows)?.variant).toBe('number');
  });

  it('reads values via a dotted accessorKey', () => {
    const col = { accessorKey: 'nested.city', header: 'City' } as DataGridColumnDef<Row>;
    const result = inferColumnFilter(col, rows);
    expect(result?.variant).toBe('select');
    expect(result?.options?.map((o) => o.value)).toEqual(['LA', 'NYC']);
  });

  it('reads values via an accessorFn', () => {
    const col = {
      id: 'ageBucket',
      accessorFn: (r: Row) => r.age,
      header: 'Age',
    } as DataGridColumnDef<Row>;
    expect(inferColumnFilter(col, rows)?.variant).toBe('number');
  });

  it('returns null for a column with no accessor (display/action column)', () => {
    const col = { id: 'actions', header: 'Actions' } as DataGridColumnDef<Row>;
    expect(inferColumnFilter(col, rows)).toBeNull();
  });

  it('returns null when the column has no non-null data', () => {
    const sparse = [{ name: '', age: 1, nested: { city: '' } }] as unknown as Row[];
    const col = { accessorKey: 'name', header: 'Name' } as DataGridColumnDef<Row>;
    // empty strings are skipped, leaving nothing to classify
    expect(inferColumnFilter(col, [{ ...sparse[0] }])).toBeNull();
  });

  it('uses random sampling so pre-sorted data is not biased toward the head', () => {
    // 1000 rows pre-sorted by category: the first 100 are all "A". Head-sampling
    // would conclude the column has a single option; random sampling sees more.
    const cats = ['A', 'B', 'C', 'D', 'E'];
    const sorted = Array.from({ length: 1000 }, (_, i) => ({
      cat: cats[Math.floor(i / 200)],
    }));
    const col = { accessorKey: 'cat', header: 'Cat' } as DataGridColumnDef<{ cat: string }>;

    const result = inferColumnFilter(col, sorted, { random: seeded(123) });
    expect(result?.variant).toBe('select');
    // A purely head-based sample of the first 100 rows would yield only "A".
    expect(result?.options?.length).toBeGreaterThan(1);
  });
});
