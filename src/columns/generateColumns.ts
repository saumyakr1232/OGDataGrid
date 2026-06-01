import type { ReactNode } from 'react';
import type { DataGridColumnDef } from '../types';

/** How many rows to scan when discovering keys, so sparse rows don't hide columns. */
const KEY_SCAN_LIMIT = 50;

/** "unitPrice" → "Unit Price", "first_name" → "First Name", "id" → "Id". */
export function humanizeKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Render an arbitrary cell value as text so React never receives a Date/object child. */
function formatValue(v: unknown): ReactNode {
  if (v == null) return '';
  if (v instanceof Date) return v.toLocaleDateString();
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/** Union of own keys across a sample of rows, in first-seen order. */
function collectKeys<T>(rows: T[]): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  const limit = Math.min(rows.length, KEY_SCAN_LIMIT);
  for (let i = 0; i < limit; i++) {
    const row = rows[i];
    if (row == null || typeof row !== 'object') continue;
    for (const k of Object.keys(row as Record<string, unknown>)) {
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
    }
  }
  return keys;
}

/**
 * Build a column per top-level key of the row data, used when the consumer
 * doesn't supply `columns`. Each column carries a string-formatting cell so
 * non-primitive values (Date, objects) render safely; the filter variant is
 * still inferred downstream from the data, exactly as for explicit columns.
 */
export function generateColumns<T>(rows: T[]): DataGridColumnDef<T>[] {
  if (!rows || rows.length === 0) return [];
  return collectKeys(rows).map(
    (key) =>
      ({
        accessorKey: key,
        header: humanizeKey(key),
        cell: ({ getValue }) => formatValue(getValue()),
      }) as DataGridColumnDef<T>,
  );
}
