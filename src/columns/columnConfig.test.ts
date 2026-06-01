import { describe, expect, it } from 'vitest';
import {
  formatCellValue,
  isDataGridConfig,
  resolveDataGridConfig,
  type DataGridConfig,
} from './columnConfig';

describe('isDataGridConfig', () => {
  it('recognizes a config object but not a column-def array or undefined', () => {
    expect(isDataGridConfig({ columns: [{ field: 'a' }] })).toBe(true);
    expect(isDataGridConfig([{ accessorKey: 'a' }] as never)).toBe(false);
    expect(isDataGridConfig(undefined)).toBe(false);
  });
});

describe('formatCellValue', () => {
  it('returns empty string for null/undefined/empty', () => {
    expect(formatCellValue(null, 'text')).toBe('');
    expect(formatCellValue(undefined, 'number')).toBe('');
    expect(formatCellValue('', 'currency')).toBe('');
  });

  it('formats currency, percent and number with Intl', () => {
    expect(formatCellValue(1234.5, 'currency', { locale: 'en-US', currency: 'USD' })).toBe('$1,234.50');
    expect(formatCellValue(0.25, 'percent', { locale: 'en-US' })).toBe('25%');
    expect(formatCellValue(1000, 'number', { locale: 'en-US' })).toBe('1,000');
  });

  it('formats dates and datetimes', () => {
    const iso = '2024-01-02';
    expect(formatCellValue(iso, 'date', { locale: 'en-US' })).toBe(
      new Date(iso).toLocaleDateString('en-US'),
    );
  });

  it('maps booleans through labels', () => {
    expect(formatCellValue(true, 'boolean')).toBe('Yes');
    expect(formatCellValue(false, 'boolean')).toBe('No');
    expect(formatCellValue(true, 'boolean', { booleanLabels: ['Active', 'Inactive'] })).toBe('Active');
  });

  it('falls back to String for non-numeric values in numeric formats', () => {
    expect(formatCellValue('n/a', 'number')).toBe('n/a');
  });
});

describe('resolveDataGridConfig', () => {
  const config: DataGridConfig = {
    columns: [
      { field: 'id', header: 'ID', width: 80 },
      { field: 'unitPrice', format: 'currency', align: 'right', aggregation: 'avg' },
      { field: 'region', filter: { variant: 'select', options: [{ label: 'N', value: 'North' }] }, groupable: true },
      { field: 'secret', hidden: true },
      { field: 'note', sortable: false, filter: false },
    ],
    groupBy: ['region'],
    sorting: [{ field: 'unitPrice', desc: true }],
  };

  const { columns, initialState } = resolveDataGridConfig(config);
  const byField = (f: string) =>
    columns.find((c) => (c as { accessorKey?: string }).accessorKey === f)!;

  it('maps field → accessorKey and humanizes a missing header', () => {
    expect((byField('unitPrice') as { accessorKey: string }).accessorKey).toBe('unitPrice');
    expect(byField('unitPrice').header).toBe('Unit Price');
    expect(byField('id').header).toBe('ID');
  });

  it('carries width, align, aggregation and filter into the def/meta', () => {
    expect((byField('id') as { size?: number }).size).toBe(80);
    const priced = byField('unitPrice');
    expect(priced.meta?.align).toBe('right');
    expect(priced.meta?.aggregationFn).toBe('avg');
    const region = byField('region');
    expect(region.meta?.filterVariant).toBe('select');
    expect(region.meta?.groupable).toBe(true);
  });

  it('disables sorting / filtering via flags', () => {
    expect((byField('note') as { enableSorting?: boolean }).enableSorting).toBe(false);
    expect((byField('note') as { enableColumnFilter?: boolean }).enableColumnFilter).toBe(false);
  });

  it('attaches a working format cell renderer', () => {
    const cell = byField('unitPrice').cell as (info: { getValue: () => unknown }) => unknown;
    expect(cell({ getValue: () => 1234.5 })).toBe(
      formatCellValue(1234.5, 'currency'),
    );
  });

  it('derives initial state: hidden → visibility, groupBy → grouping, sorting', () => {
    expect(initialState.columnVisibility).toEqual({ secret: false });
    expect(initialState.grouping).toEqual(['region']);
    expect(initialState.sorting).toEqual([{ id: 'unitPrice', desc: true }]);
  });

  it('survives a JSON string round-trip', () => {
    const restored = JSON.parse(JSON.stringify(config)) as DataGridConfig;
    const again = resolveDataGridConfig(restored);
    expect(again.initialState).toEqual(initialState);
    expect(again.columns.map((c) => c.header)).toEqual(columns.map((c) => c.header));
  });
});
