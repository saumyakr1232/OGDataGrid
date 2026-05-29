import { describe, expect, it } from 'vitest';
import { dateFilterFn, type DateFilterValue } from './DateFilter';

// Minimal row stub: dateFilterFn only calls row.getValue(columnId).
function rowWith(value: unknown) {
  return { getValue: () => value };
}

const COL = 'date';
const D = (iso: string) => new Date(iso);

function run(value: unknown, filter: DateFilterValue) {
  return dateFilterFn(rowWith(value), COL, filter);
}

const single = (op: DateFilterValue['c1']['op'], v: string | null): DateFilterValue => ({
  c1: { op, value: v },
  combinator: 'AND',
  c2: null,
});

describe('dateFilterFn — single condition', () => {
  it('passes everything when no filter is set', () => {
    expect(dateFilterFn(rowWith(D('2024-01-02')), COL, undefined)).toBe(true);
  });

  it('equals matches the same calendar day, ignoring time', () => {
    expect(run(D('2024-01-02T15:30:00'), single('is', '2024-01-02'))).toBe(true);
    expect(run(D('2024-01-03'), single('is', '2024-01-02'))).toBe(false);
  });

  it('before / after are strict', () => {
    expect(run(D('2024-01-01'), single('before', '2024-01-02'))).toBe(true);
    expect(run(D('2024-01-02'), single('before', '2024-01-02'))).toBe(false);
    expect(run(D('2024-01-03'), single('after', '2024-01-02'))).toBe(true);
    expect(run(D('2024-01-02'), single('after', '2024-01-02'))).toBe(false);
  });

  it('onOrBefore / onOrAfter include the boundary day', () => {
    expect(run(D('2024-01-02'), single('onOrBefore', '2024-01-02'))).toBe(true);
    expect(run(D('2024-01-03'), single('onOrBefore', '2024-01-02'))).toBe(false);
    expect(run(D('2024-01-02'), single('onOrAfter', '2024-01-02'))).toBe(true);
    expect(run(D('2024-01-01'), single('onOrAfter', '2024-01-02'))).toBe(false);
  });

  it('isEmpty / isNotEmpty key off the row value, not the date input', () => {
    expect(run(null, single('isEmpty', null))).toBe(true);
    expect(run(D('2024-01-02'), single('isEmpty', null))).toBe(false);
    expect(run(D('2024-01-02'), single('isNotEmpty', null))).toBe(true);
    expect(run(null, single('isNotEmpty', null))).toBe(false);
  });

  it('rejects rows when the comparison date is missing or unparseable', () => {
    expect(run(D('2024-01-02'), single('is', null))).toBe(false);
    expect(run('not-a-date', single('is', '2024-01-02'))).toBe(false);
  });

  it('accepts ISO string row values, not just Date objects', () => {
    expect(run('2024-01-02', single('is', '2024-01-02'))).toBe(true);
  });
});

describe('dateFilterFn — two conditions', () => {
  const between: DateFilterValue = {
    c1: { op: 'onOrAfter', value: '2024-01-02' },
    combinator: 'AND',
    c2: { op: 'onOrBefore', value: '2024-01-04' },
  };

  it('AND requires both conditions', () => {
    expect(run(D('2024-01-03'), between)).toBe(true);
    expect(run(D('2024-01-02'), between)).toBe(true);
    expect(run(D('2024-01-04'), between)).toBe(true);
    expect(run(D('2024-01-01'), between)).toBe(false);
    expect(run(D('2024-01-05'), between)).toBe(false);
  });

  it('OR requires either condition', () => {
    const orFilter: DateFilterValue = {
      c1: { op: 'before', value: '2024-01-02' },
      combinator: 'OR',
      c2: { op: 'after', value: '2024-01-04' },
    };
    expect(run(D('2024-01-01'), orFilter)).toBe(true);
    expect(run(D('2024-01-05'), orFilter)).toBe(true);
    expect(run(D('2024-01-03'), orFilter)).toBe(false);
  });
});
