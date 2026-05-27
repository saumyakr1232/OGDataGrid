import { TextField } from '@mui/material';
import type { Column } from '@tanstack/react-table';

export function TextFilter<T>({ column }: { column: Column<T, unknown> }) {
  const value = (column.getFilterValue() as string) ?? '';
  return (
    <TextField
      size="small"
      value={value}
      onChange={(e) => column.setFilterValue(e.target.value || undefined)}
      placeholder="Filter…"
      variant="outlined"
      fullWidth
      inputProps={{ 'aria-label': `Filter ${column.id}` }}
    />
  );
}
