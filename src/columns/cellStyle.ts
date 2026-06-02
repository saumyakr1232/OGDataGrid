import type { CSSProperties } from 'react';
import type { CellStyle, StyleConditionOp, StyleRule } from './columnConfig';

/**
 * Serializable conditional-styling helpers.
 *
 * `CellStyle`/`StyleRule` live on the JSON-serializable `ColumnConfig`, so all
 * matching and CSS mapping must work from plain primitives — no functions are
 * involved. The operator semantics mirror the advanced-filter `evalRule`
 * (see `useDataGridState`), but are kept here so the styling path stays
 * independent of the filtering path.
 */

const asNum = (x: unknown) => (typeof x === 'number' ? x : Number(x));
const asStr = (x: unknown) => (x == null ? '' : String(x));

/** Evaluate one style condition against a cell value. */
export function matchStyleCondition(
  value: unknown,
  op: StyleConditionOp,
  ruleValue?: unknown,
  ruleValue2?: unknown,
): boolean {
  switch (op) {
    case 'equals':
      return value === ruleValue;
    case 'notEquals':
      return value !== ruleValue;
    case 'contains':
      return asStr(value).toLowerCase().includes(asStr(ruleValue).toLowerCase());
    case 'notContains':
      return !asStr(value).toLowerCase().includes(asStr(ruleValue).toLowerCase());
    case 'startsWith':
      return asStr(value).toLowerCase().startsWith(asStr(ruleValue).toLowerCase());
    case 'endsWith':
      return asStr(value).toLowerCase().endsWith(asStr(ruleValue).toLowerCase());
    case 'gt':
      return asNum(value) > asNum(ruleValue);
    case 'gte':
      return asNum(value) >= asNum(ruleValue);
    case 'lt':
      return asNum(value) < asNum(ruleValue);
    case 'lte':
      return asNum(value) <= asNum(ruleValue);
    case 'between':
      return asNum(value) >= asNum(ruleValue) && asNum(value) <= asNum(ruleValue2);
    case 'isEmpty':
      return value == null || value === '';
    case 'isNotEmpty':
      return !(value == null || value === '');
    default:
      return false;
  }
}

/** Map a serializable `CellStyle` to React CSS properties. */
export function cellStyleToCss(style: CellStyle): CSSProperties {
  const css: CSSProperties = {};
  if (style.textColor) css.color = style.textColor;
  if (style.backgroundColor) css.backgroundColor = style.backgroundColor;
  if (style.fontWeight) css.fontWeight = style.fontWeight;
  if (style.fontStyle) css.fontStyle = style.fontStyle;
  return css;
}

/**
 * Resolve the effective CSS for a cell: the static `cellStyle` first, then each
 * matching rule merged in declared order (later rules win). Returns `undefined`
 * when nothing applies so callers can skip spreading an empty object.
 */
export function resolveCellStyle(
  value: unknown,
  cellStyle?: CellStyle,
  styleRules?: StyleRule[],
): CSSProperties | undefined {
  let merged: CellStyle | undefined = cellStyle ? { ...cellStyle } : undefined;

  if (styleRules) {
    for (const rule of styleRules) {
      if (matchStyleCondition(value, rule.op, rule.value, rule.value2)) {
        merged = { ...merged, ...rule.style };
      }
    }
  }

  if (!merged) return undefined;
  const css = cellStyleToCss(merged);
  return Object.keys(css).length > 0 ? css : undefined;
}
