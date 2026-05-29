import { describe, expect, it } from 'vitest';
import { generateColumns } from './generateColumns';

type Row = Record<string, unknown>;

function keysOf(cols: ReturnType<typeof generateColumns<Row>>) {
  return cols.map((c) => (c as { accessorKey: string }).accessorKey);
}
function headersOf(cols: ReturnType<typeof generateColumns<Row>>) {
  return cols.map((c) => c.header);
}

describe('generateColumns', () => {
  it('returns nothing for empty data', () => {
    expect(generateColumns([])).toEqual([]);
  });

  it('creates one column per top-level key, in first-seen order', () => {
    const cols = generateColumns<Row>([{ id: '1', name: 'Alice', age: 30 }]);
    expect(keysOf(cols)).toEqual(['id', 'name', 'age']);
  });

  it('humanizes camelCase, snake_case and kebab-case headers', () => {
    const cols = generateColumns<Row>([{ unitPrice: 1, first_name: 'a', 'is-active': true }]);
    expect(headersOf(cols)).toEqual(['Unit Price', 'First Name', 'Is Active']);
  });

  it('unions keys across sparse rows so a missing key still gets a column', () => {
    const cols = generateColumns<Row>([{ a: 1 }, { a: 2, b: 3 }]);
    expect(keysOf(cols)).toEqual(['a', 'b']);
  });

  it('renders values as safe text, including Date, boolean and null', () => {
    const cols = generateColumns<Row>([
      { d: new Date('2024-01-02'), ok: true, no: false, empty: null, n: 42, s: 'hi' },
    ]);
    const render = (key: string, value: unknown) => {
      const col = cols.find((c) => (c as { accessorKey: string }).accessorKey === key)!;
      const cell = col.cell as (info: { getValue: () => unknown }) => unknown;
      return cell({ getValue: () => value });
    };
    expect(render('d', new Date('2024-01-02'))).toBe(new Date('2024-01-02').toLocaleDateString());
    expect(render('ok', true)).toBe('Yes');
    expect(render('no', false)).toBe('No');
    expect(render('empty', null)).toBe('');
    expect(render('n', 42)).toBe('42');
    expect(render('s', 'hi')).toBe('hi');
  });

  it('stringifies nested objects rather than passing them to React', () => {
    const cols = generateColumns<Row>([{ meta: { x: 1 } }]);
    const cell = cols[0].cell as (info: { getValue: () => unknown }) => unknown;
    expect(cell({ getValue: () => ({ x: 1 }) })).toBe('{"x":1}');
  });
});
