import { createElement, type CSSProperties, type ReactNode } from 'react';
import type { CellStyle, StyleConditionOp, StyleRule } from './columnConfig';

const asNum = (x: unknown) => (typeof x === 'number' ? x : Number(x));
const asStr = (x: unknown) => (x == null ? '' : String(x));

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

export function cellStyleToCss(style: CellStyle): CSSProperties {
  const css: CSSProperties = {};
  if (style.textColor) css.color = style.textColor;
  if (style.backgroundColor) css.backgroundColor = style.backgroundColor;
  if (style.fontWeight) css.fontWeight = style.fontWeight;
  if (style.fontStyle) css.fontStyle = style.fontStyle;
  return css;
}

export interface ResolvedCellStyle {
  variant: 'text' | 'chip';
  css: CSSProperties;
}

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

// base style first, then each matching rule on top (last one wins)
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

// undefined for a plain text cell with nothing applied, so callers render as-is
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

export function renderChip(content: ReactNode, css: CSSProperties, key?: string): ReactNode {
  const style: CSSProperties = { ...CHIP_BASE_CSS, ...css };
  if (!style.backgroundColor) style.backgroundColor = CHIP_DEFAULT_BG;
  return createElement('span', { key, style }, content);
}
