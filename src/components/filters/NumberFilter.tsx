import { Box, TextField } from '@mui/material';
import type { Column } from '@tanstack/react-table';

type Range = [number | '', number | ''];

export function NumberFilter<T>({ column }: { column: Column<T, unknown> }) {
  const raw = (column.getFilterValue() as Range) ?? ['', ''];
  const [min, max] = raw;
  const update = (next: Range) => {
    const isEmpty = next[0] === '' && next[1] === '';
    column.setFilterValue(isEmpty ? undefined : next);
  };
  return (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      <TextField
        size="small"
        type="number"
        value={min}
        placeholder="Min"
        onChange={(e) => update([e.target.value === '' ? '' : Number(e.target.value), max])}
        inputProps={{ 'aria-label': `Min ${column.id}` }}
      />
      <TextField
        size="small"
        type="number"
        value={max}
        placeholder="Max"
        onChange={(e) => update([min, e.target.value === '' ? '' : Number(e.target.value)])}
        inputProps={{ 'aria-label': `Max ${column.id}` }}
      />
    </Box>
  );
}

export function numberRangeFilterFn(
  row: { getValue: (id: string) => unknown },
  columnId: string,
  filterValue: Range,
): boolean {
  if (!filterValue) return true;
  const [min, max] = filterValue;
  const v = row.getValue(columnId);
  if (v == null) return false;
  const n = Number(v);
  if (Number.isNaN(n)) return false;
  if (min !== '' && n < min) return false;
  if (max !== '' && n > max) return false;
  return true;
}
