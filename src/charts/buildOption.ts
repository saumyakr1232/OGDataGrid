import type { Row, Table } from '@tanstack/react-table';
import type { AggregationFn } from '../types';

export type ChartType = 'bar' | 'stackedBar' | 'line' | 'area' | 'pie' | 'doughnut' | 'scatter';

export interface ChartConfig {
  type: ChartType;
  title?: string;
  categoryCol: string;
  seriesCols: string[];          // numeric value columns
  splitByCol?: string;           // optional: pivot one numeric column across distinct values
  aggregation: AggregationFn;
  legend?: boolean;
  downsample?: boolean;
  maxPoints?: number;            // when downsampling
}

interface ChartSeries {
  name: string;
  type: 'bar' | 'line' | 'pie' | 'scatter';
  data: Array<number | [number, number] | { name: string; value: number }>;
  stack?: string;
  areaStyle?: object;
  smooth?: boolean;
  radius?: string | (string | number)[];
  emphasis?: object;
}

interface ChartOption {
  title?: { text: string; left: string };
  tooltip: { trigger: string };
  legend?: { top?: string | number; show?: boolean };
  xAxis?: object;
  yAxis?: object;
  series: ChartSeries[];
  grid?: object;
  animation?: boolean;
}

function aggregate(values: number[], fn: AggregationFn): number {
  if (values.length === 0) return 0;
  switch (fn) {
    case 'sum':   return values.reduce((a, b) => a + b, 0);
    case 'avg':   return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min':   return Math.min(...values);
    case 'max':   return Math.max(...values);
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

function downsampleArr<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  const out: T[] = [];
  for (let i = 0; i < max; i++) {
    out.push(arr[Math.floor(i * step)]);
  }
  return out;
}

/**
 * Build an ECharts option from the table's current row model + a ChartConfig.
 *
 * Reads `table.getRowModel().rows` so it respects sort/filter/grouping/pagination
 * that the user has applied to the grid. Pass `rangeRows` to restrict the
 * dataset to a subset (e.g. when charting from a selected cell range).
 */
export function buildEChartsOption<T>(
  table: Table<T>,
  cfg: ChartConfig,
  rangeRows?: Row<T>[],
): ChartOption {
  const rows = rangeRows ?? table.getRowModel().rows;
  const maxPoints = cfg.maxPoints ?? 500;
  const useDownsample = cfg.downsample !== false && rows.length > maxPoints;

  const dataRows: Row<T>[] = useDownsample ? downsampleArr(rows, maxPoints) : rows;

  // Group by category column → build series.
  const buckets = new Map<string, Row<T>[]>();
  for (const row of dataRows) {
    const key = String(row.getValue(cfg.categoryCol) ?? '');
    const list = buckets.get(key);
    if (list) list.push(row);
    else buckets.set(key, [row]);
  }
  const categories = Array.from(buckets.keys());

  // Series construction. Two paths:
  //   1) splitBy mode: one numeric column, split into series keyed by distinct values of splitByCol
  //   2) normal: each seriesCols column becomes a series
  let series: ChartSeries[] = [];
  if (cfg.splitByCol && cfg.seriesCols.length > 0) {
    const valueCol = cfg.seriesCols[0];
    const splitValues = new Set<string>();
    for (const row of dataRows) {
      splitValues.add(String(row.getValue(cfg.splitByCol) ?? ''));
    }
    for (const split of Array.from(splitValues)) {
      const data: number[] = categories.map((cat) => {
        const bucket = buckets.get(cat) ?? [];
        const vals: number[] = [];
        for (const row of bucket) {
          if (String(row.getValue(cfg.splitByCol!) ?? '') !== split) continue;
          const n = asNum(row.getValue(valueCol));
          if (n !== null) vals.push(n);
        }
        return aggregate(vals, cfg.aggregation);
      });
      series.push({
        name: split,
        type: cartesianType(cfg.type),
        data,
        ...(cfg.type === 'stackedBar' ? { stack: 'total' } : {}),
        ...(cfg.type === 'area' ? { areaStyle: {} } : {}),
        ...(cfg.type === 'line' || cfg.type === 'area' ? { smooth: true } : {}),
      });
    }
  } else {
    for (const colId of cfg.seriesCols) {
      const col = table.getColumn(colId);
      const data: number[] = categories.map((cat) => {
        const bucket = buckets.get(cat) ?? [];
        const vals: number[] = [];
        for (const row of bucket) {
          const n = asNum(row.getValue(colId));
          if (n !== null) vals.push(n);
        }
        return aggregate(vals, cfg.aggregation);
      });
      series.push({
        name: String(col?.columnDef.header ?? colId),
        type: cartesianType(cfg.type),
        data,
        ...(cfg.type === 'stackedBar' ? { stack: 'total' } : {}),
        ...(cfg.type === 'area' ? { areaStyle: {} } : {}),
        ...(cfg.type === 'line' || cfg.type === 'area' ? { smooth: true } : {}),
      });
    }
  }

  // Pie/doughnut: collapse to a single series of {name, value}
  if (cfg.type === 'pie' || cfg.type === 'doughnut') {
    const valueCol = cfg.seriesCols[0];
    if (!valueCol) {
      return baseOption(cfg, [], categories);
    }
    const pieData = categories.map((cat) => {
      const bucket = buckets.get(cat) ?? [];
      const vals: number[] = [];
      for (const row of bucket) {
        const n = asNum(row.getValue(valueCol));
        if (n !== null) vals.push(n);
      }
      return { name: cat, value: aggregate(vals, cfg.aggregation) };
    });
    series = [
      {
        name: String(table.getColumn(valueCol)?.columnDef.header ?? valueCol),
        type: 'pie',
        data: pieData,
        radius: cfg.type === 'doughnut' ? ['40%', '70%'] : '60%',
        emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.4)' } },
      },
    ];
  }

  // Scatter: needs paired x/y. Use first two seriesCols.
  if (cfg.type === 'scatter') {
    const xCol = cfg.seriesCols[0];
    const yCol = cfg.seriesCols[1] ?? cfg.seriesCols[0];
    const data: [number, number][] = [];
    for (const row of dataRows) {
      const x = asNum(row.getValue(xCol));
      const y = asNum(row.getValue(yCol));
      if (x === null || y === null) continue;
      data.push([x, y]);
    }
    series = [
      {
        name: `${xCol} vs ${yCol}`,
        type: 'scatter',
        data,
      },
    ];
  }

  return baseOption(cfg, series, categories);
}

function cartesianType(t: ChartType): 'bar' | 'line' {
  if (t === 'line' || t === 'area') return 'line';
  return 'bar';
}

function baseOption(cfg: ChartConfig, series: ChartSeries[], categories: string[]): ChartOption {
  const isCartesian =
    cfg.type === 'bar' ||
    cfg.type === 'stackedBar' ||
    cfg.type === 'line' ||
    cfg.type === 'area' ||
    cfg.type === 'scatter';
  const opt: ChartOption = {
    title: cfg.title ? { text: cfg.title, left: 'center' } : undefined,
    tooltip: { trigger: cfg.type === 'pie' || cfg.type === 'doughnut' ? 'item' : 'axis' },
    legend: cfg.legend !== false ? { top: 24 } : { show: false },
    series,
    grid: isCartesian ? { left: 50, right: 16, bottom: 32, top: 64 } : undefined,
    animation: true,
  };
  if (isCartesian) {
    if (cfg.type === 'scatter') {
      opt.xAxis = { type: 'value' };
      opt.yAxis = { type: 'value' };
    } else {
      opt.xAxis = { type: 'category', data: categories };
      opt.yAxis = { type: 'value' };
    }
  }
  return opt;
}
