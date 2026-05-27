import { Box } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import type { Column } from '@tanstack/react-table';

type Range = [Date | null, Date | null];

// The MUI DatePicker speaks whatever type its adapter uses (Date for date-fns,
// Dayjs for dayjs, etc). To keep the filter value adapter-agnostic, we
// normalise to JS Date in the stored filter value.
function toDate(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return v;
  // Dayjs object
  if (typeof v === 'object' && v !== null && typeof (v as { toDate?: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  const d = new Date(v as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function DateFilter<T>({ column }: { column: Column<T, unknown> }) {
  const raw = (column.getFilterValue() as Range) ?? [null, null];
  const [from, to] = raw;
  const update = (next: Range) => {
    const isEmpty = next[0] == null && next[1] == null;
    column.setFilterValue(isEmpty ? undefined : next);
  };
  return (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      <DatePicker
        value={from as unknown as null}
        onChange={(d: unknown) => update([toDate(d), to])}
        slotProps={{ textField: { size: 'small', placeholder: 'From' } }}
      />
      <DatePicker
        value={to as unknown as null}
        onChange={(d: unknown) => update([from, toDate(d)])}
        slotProps={{ textField: { size: 'small', placeholder: 'To' } }}
      />
    </Box>
  );
}

export function dateRangeFilterFn(
  row: { getValue: (id: string) => unknown },
  columnId: string,
  filterValue: Range,
): boolean {
  if (!filterValue) return true;
  const [from, to] = filterValue;
  const v = row.getValue(columnId);
  if (v == null) return false;
  const d = v instanceof Date ? v : new Date(v as string | number);
  if (Number.isNaN(d.getTime())) return false;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}
