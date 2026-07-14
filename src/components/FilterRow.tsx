import { TableCell, TableRow } from '@mui/material';
import type { Header } from '@tanstack/react-table';
import { TextFilter } from './filters/TextFilter';
import { NumberFilter } from './filters/NumberFilter';
import { DateFilter } from './filters/DateFilter';
import { SelectFilter } from './filters/SelectFilter';
import { BooleanFilter } from './filters/BooleanFilter';
import type { DataGridColumnMeta } from '../types';

export function FilterRow<T>({
  headers,
  resetKey,
}: {
  headers: Header<T, unknown>[];
  /** Bumped on resetFilters(); lets the debounced inputs drop in-flight edits. */
  resetKey?: number;
}) {
  return (
    <TableRow>
      {headers.map((header) => {
        const col = header.column;
        const meta = col.columnDef.meta as DataGridColumnMeta<T> | undefined;
        const variant = meta?.filterVariant ?? 'text';
        const canFilter = col.getCanFilter();
        return (
          <TableCell
            key={header.id}
            sx={{ padding: '4px 8px', borderBottom: 1, borderColor: 'divider', background: 'background.paper' }}
            style={{ width: header.getSize() }}
          >
            {!canFilter ? null : variant === 'number' ? (
              <NumberFilter column={col} resetKey={resetKey} />
            ) : variant === 'date' ? (
              <DateFilter column={col} />
            ) : variant === 'select' ? (
              <SelectFilter column={col} options={meta?.filterOptions ?? []} />
            ) : variant === 'multiSelect' ? (
              <SelectFilter column={col} options={meta?.filterOptions ?? []} multi />
            ) : variant === 'boolean' ? (
              <BooleanFilter column={col} />
            ) : (
              <TextFilter column={col} resetKey={resetKey} />
            )}
          </TableCell>
        );
      })}
    </TableRow>
  );
}
