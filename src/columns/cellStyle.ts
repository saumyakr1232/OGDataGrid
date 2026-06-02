import { createElement, type CSSProperties, type ReactNode } from 'react';
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

/** Map a serializable `CellStyle` to React CSS properties (the `variant` is not CSS). */
export function cellStyleToCss(style: CellStyle): CSSProperties {
  const css: CSSProperties = {};
  if (style.textColor) css.color = style.textColor;
  if (style.backgroundColor) css.backgroundColor = style.backgroundColor;
  if (style.fontWeight) css.fontWeight = style.fontWeight;
  if (style.fontStyle) css.fontStyle = style.fontStyle;
  return css;
}

/** The effective presentation of a cell after merging base style + rules. */
export interface ResolvedCellStyle {
  variant: 'text' | 'chip';
  css: CSSProperties;
}

/** Static base layout for the `chip` variant; resolved colors merge on top. */
const CHIP_BASE_CSS: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 10px',
  borderRadius: 12,
  fontSize: '0.8125rem',
  lineHeight: 1.5,
  maxWidth: '100%',
  whiteSpace: 'nowrap',
};
const CHIP_DEFAULT_BG = 'rgba(0,0,0,0.08)';

/** Merge the static `cellStyle` with each matching rule (later matches win). */
function mergeStyle(
  value: unknown,
  cellStyle?: CellStyle,
  styleRules?: StyleRule[],
): CellStyle | undefined {
  let merged: CellStyle | undefined = cellStyle ? { ...cellStyle } : undefined;
  if (styleRules) {
    for (const rule of styleRules) {
      if (matchStyleCondition(value, rule.op, rule.value, rule.value2)) {
        merged = { ...merged, ...rule.style };
      }
    }
  }
  return merged;
}

/**
 * Resolve the effective CSS for a cell. Returns `undefined` when nothing applies
 * so callers can skip spreading an empty object. (CSS only — see
 * `resolveCellStyleSpec` for the chip variant.)
 */
export function resolveCellStyle(
  value: unknown,
  cellStyle?: CellStyle,
  styleRules?: StyleRule[],
): CSSProperties | undefined {
  const merged = mergeStyle(value, cellStyle, styleRules);
  if (!merged) return undefined;
  const css = cellStyleToCss(merged);
  return Object.keys(css).length > 0 ? css : undefined;
}

/**
 * Resolve the full presentation (variant + CSS) for a cell. Returns `undefined`
 * for a plain `text` cell with no styling, so callers can render the value as-is.
 */
export function resolveCellStyleSpec(
  value: unknown,
  cellStyle?: CellStyle,
  styleRules?: StyleRule[],
): ResolvedCellStyle | undefined {
  const merged = mergeStyle(value, cellStyle, styleRules);
  if (!merged) return undefined;
  const variant = merged.variant ?? 'text';
  const css = cellStyleToCss(merged);
  if (variant === 'text' && Object.keys(css).length === 0) return undefined;
  return { variant, css };
}

/** Wrap content in a chip (rounded pill) styled with the resolved CSS. */
export function renderChip(content: ReactNode, css: CSSProperties, key?: string): ReactNode {
  const style: CSSProperties = { ...CHIP_BASE_CSS, ...css };
  if (!style.backgroundColor) style.backgroundColor = CHIP_DEFAULT_BG;
  return createElement('span', { key, style }, content);
}
