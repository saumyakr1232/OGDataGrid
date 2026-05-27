import type { AggregationFn, DataGridColumnDef } from '../types';

export interface PivotConfig {
  rowGroupCols: string[];
  colGroupCols: string[];
  valueCols: { columnId: string; aggregation: AggregationFn }[];
}

function aggregate(values: number[], fn: AggregationFn): number {
  if (values.length === 0) return 0;
  switch (fn) {
    case 'sum': return values.reduce((a, b) => a + b, 0);
    case 'avg': return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min': return Math.min(...values);
    case 'max': return Math.max(...values);
    case 'count': return values.length;
    case 'uniqueCount': return new Set(values).size;
    default: return values.reduce((a, b) => a + b, 0);
  }
}

function asNum(v: unknown): number | null {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function readPath<T extends Record<string, unknown>>(row: T, cols: string[]): string {
  return cols.map((c) => String(row[c] ?? '')).join(' / ');
}

export interface PivotResult {
  rows: Record<string, unknown>[];
  columns: DataGridColumnDef<Record<string, unknown>>[];
}

/**
 * Build a pivoted dataset + dynamic column defs from a source array of rows.
 * Pure function — easy to unit test.
 */
export function buildPivot<T extends Record<string, unknown>>(
  source: T[],
  cfg: PivotConfig,
  headerLabels: Record<string, string> = {},
): PivotResult {
  if (
    cfg.rowGroupCols.length === 0 ||
    cfg.valueCols.length === 0
  ) {
    return { rows: [], columns: [] };
  }
  const label = (id: string) => headerLabels[id] ?? id;

  // Discover distinct column-group keys (across all rows).
  const colKeys = new Set<string>();
  if (cfg.colGroupCols.length > 0) {
    for (const row of source) {
      colKeys.add(readPath(row, cfg.colGroupCols));
    }
  } else {
    colKeys.add(''); // single bucket when no col grouping
  }
  const sortedColKeys = Array.from(colKeys).sort();

  // Group source rows by row-group path → col-group path → list.
  const grouped = new Map<string, Map<string, T[]>>();
  for (const row of source) {
    const rk = readPath(row, cfg.rowGroupCols);
    const ck = cfg.colGroupCols.length > 0 ? readPath(row, cfg.colGroupCols) : '';
    let byCol = grouped.get(rk);
    if (!byCol) {
      byCol = new Map<string, T[]>();
      grouped.set(rk, byCol);
    }
    const list = byCol.get(ck);
    if (list) list.push(row);
    else byCol.set(ck, [row]);
  }

  // Build columns: one fixed col per row-group dimension, then one synthetic
  // col per (colKey × valueCol).
  const columns: DataGridColumnDef<Record<string, unknown>>[] = [];
  for (const rg of cfg.rowGroupCols) {
    columns.push({
      id: `__pivot_row_${rg}`,
      accessorKey: `__pivot_row_${rg}`,
      header: label(rg),
      meta: { hideable: false, reorderable: false },
    });
  }
  for (const ck of sortedColKeys) {
    for (const vc of cfg.valueCols) {
      const id = `__pivot_v__${ck}__${vc.columnId}__${vc.aggregation}`;
      const headerText =
        ck === ''
          ? `${label(vc.columnId)} (${vc.aggregation})`
          : `${ck} · ${label(vc.columnId)} (${vc.aggregation})`;
      columns.push({
        id,
        accessorKey: id,
        header: headerText,
        meta: { align: 'right' },
      });
    }
  }

  // Build rows: one per distinct row-group path.
  const outRows: Record<string, unknown>[] = [];
  const sortedRowKeys = Array.from(grouped.keys()).sort();
  for (const rk of sortedRowKeys) {
    const rowObj: Record<string, unknown> = {};
    // Reconstruct row-group cells. We use the first source row in this bucket
    // to read the original column values (preserves type / formatting).
    const buckets = grouped.get(rk)!;
    const firstBucket = Array.from(buckets.values())[0];
    const sampleRow = firstBucket?.[0];
    for (const rg of cfg.rowGroupCols) {
      rowObj[`__pivot_row_${rg}`] = sampleRow ? sampleRow[rg] : null;
    }
    for (const ck of sortedColKeys) {
      const list = buckets.get(ck) ?? [];
      for (const vc of cfg.valueCols) {
        const id = `__pivot_v__${ck}__${vc.columnId}__${vc.aggregation}`;
        const vals: number[] = [];
        for (const row of list) {
          const n = asNum(row[vc.columnId]);
          if (n !== null) vals.push(n);
        }
        rowObj[id] = vals.length > 0 ? aggregate(vals, vc.aggregation) : null;
      }
    }
    outRows.push(rowObj);
  }

  return { rows: outRows, columns };
}
