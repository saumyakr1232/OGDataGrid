import { Box, TextField } from '@mui/material';
import type { Column } from '@tanstack/react-table';
import { useDebouncedFilter } from '../../hooks/useDebouncedFilter';

type Range = [number | '', number | ''];

// Stable empty reference so useDebouncedFilter's external-sync comparison
// doesn't see a brand-new array every render when no filter is set.
const EMPTY_RANGE: Range = ['', ''];

export function NumberFilter<T>({ column }: { column: Column<T, unknown> }) {
  const committed = (column.getFilterValue() as Range) ?? EMPTY_RANGE;
  // local value keeps typing instant; the per-row re-filter is debounced and
  // committed inside a transition (see useDebouncedFilter).
  const { value, setValue } = useDebouncedFilter<Range>(committed, (next) =>
    column.setFilterValue(next[0] === '' && next[1] === '' ? undefined : next),
  );
  const [min, max] = value;
  return (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      <TextField
        size="small"
        type="number"
        value={min}
        placeholder="Min"
        onChange={(e) => setValue([e.target.value === '' ? '' : Number(e.target.value), max])}
        inputProps={{ 'aria-label': `Min ${column.id}` }}
      />
      <TextField
        size="small"
        type="number"
        value={max}
        placeholder="Max"
        onChange={(e) => setValue([min, e.target.value === '' ? '' : Number(e.target.value)])}
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
