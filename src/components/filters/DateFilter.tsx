import { useState } from 'react';
import {
  Box,
  Button,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Popover,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Tooltip,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import type { Column } from '@tanstack/react-table';

/**
 * A Notion-style date filter: each condition pairs an operator with a date,
 * and up to two conditions can be combined with AND / OR. The popover edits a
 * draft and only commits to the column filter state on "Apply".
 */
export type DateOp =
  | 'is'
  | 'before'
  | 'after'
  | 'onOrBefore'
  | 'onOrAfter'
  | 'isEmpty'
  | 'isNotEmpty';

export interface DateCondition {
  op: DateOp;
  /** ISO `yyyy-mm-dd` (from a native date input), or null when not yet set. */
  value: string | null;
}

export interface DateFilterValue {
  c1: DateCondition;
  combinator: 'AND' | 'OR';
  c2: DateCondition | null;
}

const OP_LABELS: Record<DateOp, string> = {
  is: 'Equals',
  before: 'Before',
  after: 'After',
  onOrBefore: 'On or before',
  onOrAfter: 'On or after',
  isEmpty: 'Is empty',
  isNotEmpty: 'Is not empty',
};
const OP_OPTIONS = Object.keys(OP_LABELS) as DateOp[];

const needsValue = (op: DateOp) => op !== 'isEmpty' && op !== 'isNotEmpty';
const conditionReady = (c: DateCondition | null) =>
  !!c && (!needsValue(c.op) || !!c.value);

function describe(c: DateCondition): string {
  if (!needsValue(c.op)) return OP_LABELS[c.op].toLowerCase();
  return `${OP_LABELS[c.op].toLowerCase()} ${c.value ?? '…'}`;
}

function summarize(v: DateFilterValue): string {
  const s1 = describe(v.c1);
  if (!conditionReady(v.c2) || !v.c2) return s1;
  return `${s1} ${v.combinator.toLowerCase()} ${describe(v.c2)}`;
}

function ConditionEditor({
  value,
  onChange,
}: {
  value: DateCondition;
  onChange: (c: DateCondition) => void;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      <Select
        size="small"
        value={value.op}
        onChange={(e) => onChange({ ...value, op: e.target.value as DateOp })}
      >
        {OP_OPTIONS.map((op) => (
          <MenuItem key={op} value={op}>
            {OP_LABELS[op]}
          </MenuItem>
        ))}
      </Select>
      {needsValue(value.op) && (
        <TextField
          type="date"
          size="small"
          value={value.value ?? ''}
          onChange={(e) => onChange({ ...value, value: e.target.value || null })}
          InputLabelProps={{ shrink: true }}
        />
      )}
    </Box>
  );
}

export function DateFilter<T>({ column }: { column: Column<T, unknown> }) {
  const applied = column.getFilterValue() as DateFilterValue | undefined;
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const [c1, setC1] = useState<DateCondition>({ op: 'is', value: null });
  const [combinator, setCombinator] = useState<'AND' | 'OR'>('AND');
  const [c2, setC2] = useState<DateCondition | null>(null);

  const openPopover = (e: React.MouseEvent<HTMLElement>) => {
    // Seed the draft from whatever is currently applied so re-opening edits it.
    const a = column.getFilterValue() as DateFilterValue | undefined;
    setC1(a?.c1 ?? { op: 'is', value: null });
    setCombinator(a?.combinator ?? 'AND');
    setC2(a?.c2 ?? null);
    setAnchor(e.currentTarget);
  };
  const close = () => setAnchor(null);

  const apply = () => {
    if (!conditionReady(c1)) {
      column.setFilterValue(undefined);
      close();
      return;
    }
    column.setFilterValue({
      c1,
      combinator,
      c2: conditionReady(c2) ? c2 : null,
    } satisfies DateFilterValue);
    close();
  };

  const clear = () => {
    column.setFilterValue(undefined);
    setC1({ op: 'is', value: null });
    setCombinator('AND');
    setC2(null);
    close();
  };

  return (
    <>
      <Button
        fullWidth
        size="small"
        variant="outlined"
        onClick={openPopover}
        startIcon={<FilterListIcon fontSize="small" />}
        sx={{
          // Match the height of the sibling small outlined inputs (40px) so the
          // filter row stays visually aligned.
          height: 40,
          justifyContent: 'flex-start',
          textTransform: 'none',
          fontWeight: 400,
          borderColor: 'rgba(0, 0, 0, 0.23)',
          color: applied ? 'text.primary' : 'text.secondary',
          minWidth: 0,
        }}
      >
        <Box
          component="span"
          sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {applied ? summarize(applied) : 'Date…'}
        </Box>
      </Button>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1.5, width: 280, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', color: 'text.secondary' }}>
            <FilterListIcon fontSize="small" />
          </Box>
          <ConditionEditor value={c1} onChange={setC1} />

          <RadioGroup
            row
            value={combinator}
            onChange={(e) => {
              setCombinator(e.target.value as 'AND' | 'OR');
              if (!c2) setC2({ op: 'after', value: null });
            }}
            sx={{ justifyContent: 'center' }}
          >
            <FormControlLabel value="AND" control={<Radio size="small" />} label="AND" />
            <FormControlLabel value="OR" control={<Radio size="small" />} label="OR" />
          </RadioGroup>

          {c2 ? (
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <ConditionEditor value={c2} onChange={setC2} />
              </Box>
              <Tooltip title="Remove second condition">
                <IconButton size="small" onClick={() => setC2(null)} aria-label="Remove second condition">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ) : (
            <Button size="small" onClick={() => setC2({ op: 'after', value: null })}>
              + Add condition
            </Button>
          )}

          <Divider sx={{ my: 0.5 }} />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button size="small" onClick={clear}>
              Clear
            </Button>
            <Button size="small" variant="outlined" onClick={apply}>
              Apply
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
}

function dayFromDate(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function rowDay(v: unknown): number | null {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(v as string | number);
  return Number.isNaN(d.getTime()) ? null : dayFromDate(d);
}

function isoDay(s: string | null): number | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d).getTime();
}

function evalCondition(rowValue: unknown, cond: DateCondition): boolean {
  if (cond.op === 'isEmpty') return rowValue == null;
  if (cond.op === 'isNotEmpty') return rowValue != null;
  const a = rowDay(rowValue);
  const b = isoDay(cond.value);
  if (a == null || b == null) return false;
  switch (cond.op) {
    case 'is':
      return a === b;
    case 'before':
      return a < b;
    case 'after':
      return a > b;
    case 'onOrBefore':
      return a <= b;
    case 'onOrAfter':
      return a >= b;
    default:
      return true;
  }
}

/**
 * Column `filterFn` for the date filter value. The grid auto-wires this for any
 * column declaring `meta.filterVariant: 'date'`, so consumers don't have to.
 */
export function dateFilterFn(
  row: { getValue: (id: string) => unknown },
  columnId: string,
  filterValue: DateFilterValue | undefined,
): boolean {
  if (!filterValue) return true;
  const v = row.getValue(columnId);
  const r1 = evalCondition(v, filterValue.c1);
  if (!filterValue.c2) return r1;
  const r2 = evalCondition(v, filterValue.c2);
  return filterValue.combinator === 'AND' ? r1 && r2 : r1 || r2;
}
