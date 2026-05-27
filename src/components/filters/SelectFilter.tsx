import { MenuItem, Select } from '@mui/material';
import type { Column } from '@tanstack/react-table';

interface Opt {
  label: string;
  value: unknown;
}

export function SelectFilter<T>({
  column,
  options,
  multi,
}: {
  column: Column<T, unknown>;
  options: Opt[];
  multi?: boolean;
}) {
  const value = column.getFilterValue();
  const safeValue = multi
    ? ((value as unknown[] | undefined) ?? [])
    : value == null
      ? ''
      : (value as string | number);
  return (
    <Select
      size="small"
      fullWidth
      multiple={multi}
      displayEmpty
      value={safeValue as never}
      onChange={(e) => {
        const next = e.target.value;
        if (multi) {
          const arr = (Array.isArray(next) ? next : [next]).filter((x) => x !== '');
          column.setFilterValue(arr.length === 0 ? undefined : arr);
        } else {
          column.setFilterValue(next === '' ? undefined : next);
        }
      }}
      renderValue={(v) => {
        if (multi) {
          const arr = v as unknown[];
          if (arr.length === 0) return <em style={{ opacity: 0.6 }}>Any</em>;
          return arr
            .map((val) => options.find((o) => o.value === val)?.label ?? String(val))
            .join(', ');
        }
        if (v === '' || v == null) return <em style={{ opacity: 0.6 }}>Any</em>;
        return options.find((o) => o.value === v)?.label ?? String(v);
      }}
      inputProps={{ 'aria-label': `Filter ${column.id}` }}
    >
      {!multi && (
        <MenuItem value="">
          <em>Any</em>
        </MenuItem>
      )}
      {options.map((o) => (
        <MenuItem key={String(o.value)} value={o.value as never}>
          {o.label}
        </MenuItem>
      ))}
    </Select>
  );
}

export function inListFilterFn(
  row: { getValue: (id: string) => unknown },
  columnId: string,
  filterValue: unknown[],
): boolean {
  if (!filterValue || filterValue.length === 0) return true;
  return filterValue.some((v) => v === row.getValue(columnId));
}
