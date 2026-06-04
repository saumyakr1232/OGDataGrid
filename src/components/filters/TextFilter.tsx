import { TextField } from '@mui/material';
import type { Column } from '@tanstack/react-table';
import { useDebouncedFilter } from '../../hooks/useDebouncedFilter';

export function TextFilter<T>({ column }: { column: Column<T, unknown> }) {
  const committed = (column.getFilterValue() as string) ?? '';
  // local value keeps typing instant; the per-row re-filter is debounced and
  // committed inside a transition (see useDebouncedFilter).
  const { value, setValue } = useDebouncedFilter<string>(committed, (next) =>
    column.setFilterValue(next || undefined),
  );
  return (
    <TextField
      size="small"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Filter…"
      variant="outlined"
      fullWidth
      inputProps={{ 'aria-label': `Filter ${column.id}` }}
    />
  );
}
