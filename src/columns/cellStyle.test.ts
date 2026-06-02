import { describe, expect, it } from 'vitest';
import { cellStyleToCss, matchStyleCondition, resolveCellStyle } from './cellStyle';

describe('matchStyleCondition', () => {
  it('handles equality and string operators', () => {
    expect(matchStyleCondition('North', 'equals', 'North')).toBe(true);
    expect(matchStyleCondition('North', 'notEquals', 'South')).toBe(true);
    expect(matchStyleCondition('Widget Pro', 'contains', 'pro')).toBe(true);
    expect(matchStyleCondition('Widget Pro', 'notContains', 'cog')).toBe(true);
    expect(matchStyleCondition('Widget', 'startsWith', 'wid')).toBe(true);
    expect(matchStyleCondition('Widget', 'endsWith', 'get')).toBe(true);
  });

  it('handles numeric comparisons including between', () => {
    expect(matchStyleCondition(5, 'gt', 3)).toBe(true);
    expect(matchStyleCondition(5, 'gte', 5)).toBe(true);
    expect(matchStyleCondition(2, 'lt', 3)).toBe(true);
    expect(matchStyleCondition(3, 'lte', 3)).toBe(true);
    expect(matchStyleCondition(5, 'between', 1, 10)).toBe(true);
    expect(matchStyleCondition(20, 'between', 1, 10)).toBe(false);
  });

  it('handles emptiness checks', () => {
    expect(matchStyleCondition('', 'isEmpty')).toBe(true);
    expect(matchStyleCondition(null, 'isEmpty')).toBe(true);
    expect(matchStyleCondition('x', 'isNotEmpty')).toBe(true);
  });
});

describe('cellStyleToCss', () => {
  it('maps the serializable style onto CSS props', () => {
    expect(
      cellStyleToCss({
        textColor: '#b00020',
        backgroundColor: '#fff',
        fontWeight: 'bold',
        fontStyle: 'italic',
      }),
    ).toEqual({
      color: '#b00020',
      backgroundColor: '#fff',
      fontWeight: 'bold',
      fontStyle: 'italic',
    });
  });
});

describe('resolveCellStyle', () => {
  it('returns undefined when nothing applies', () => {
    expect(resolveCellStyle(5)).toBeUndefined();
    expect(resolveCellStyle(5, undefined, [{ op: 'gt', value: 10, style: { textColor: 'red' } }])).toBeUndefined();
  });

  it('applies the static cellStyle', () => {
    expect(resolveCellStyle('x', { textColor: 'blue' })).toEqual({ color: 'blue' });
  });

  it('merges matching rules in order, later wins', () => {
    const css = resolveCellStyle(9000, { textColor: 'black' }, [
      { op: 'gte', value: 5000, style: { backgroundColor: '#eee' } },
      { op: 'gte', value: 8000, style: { textColor: 'green', fontWeight: 'bold' } },
    ]);
    expect(css).toEqual({ color: 'green', backgroundColor: '#eee', fontWeight: 'bold' });
  });
});
