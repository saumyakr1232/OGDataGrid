import { MenuItem, Select } from '@mui/material';
import type { Column } from '@tanstack/react-table';

export function BooleanFilter<T>({ column }: { column: Column<T, unknown> }) {
  const value = column.getFilterValue();
  const v = value == null ? '' : String(value);
  return (
    <Select
      size="small"
      fullWidth
      displayEmpty
      value={v}
      onChange={(e) => {
        const next = e.target.value;
        column.setFilterValue(next === '' ? undefined : next === 'true');
      }}
      inputProps={{ 'aria-label': `Filter ${column.id}` }}
    >
      <MenuItem value="">
        <em>Any</em>
      </MenuItem>
      <MenuItem value="true">True</MenuItem>
      <MenuItem value="false">False</MenuItem>
    </Select>
  );
}
