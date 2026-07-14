import { TextField } from '@mui/material';
import type { Column } from '@tanstack/react-table';
import { useDebouncedFilter } from '../../hooks/useDebouncedFilter';

export function TextFilter<T>({
  column,
  resetKey,
}: {
  column: Column<T, unknown>;
  resetKey?: number;
}) {
  const committed = (column.getFilterValue() as string) ?? '';
  const { value, setValue } = useDebouncedFilter<string>(
    committed,
    (next) => column.setFilterValue(next || undefined),
    undefined,
    resetKey,
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
