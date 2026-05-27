import { TableRow } from '@mui/material';
import type { Table } from '@tanstack/react-table';
import { BodyCell } from '../styled';
import type { DataGridColumnMeta, Density } from '../types';

/**
 * Render a row of literal user-supplied data using the table's visible column
 * layout. Skips TanStack's row model entirely — these rows exist outside
 * filtering, sorting and grouping so they make sense as "totals" / pinned info.
 */
export function PinnedRows<T>({
  table,
  rows,
  density,
  position,
}: {
  table: Table<T>;
  rows: T[];
  density: Density;
  position: 'top' | 'bottom';
}) {
  if (!rows || rows.length === 0) return null;
  const cols = table.getVisibleLeafColumns();
  return (
    <>
      {rows.map((row, i) => (
        <TableRow
          key={`${position}-${i}`}
          sx={{
            background: 'action.selected',
            fontWeight: 600,
            borderTop: position === 'bottom' ? '2px solid' : undefined,
            borderBottom: position === 'top' ? '2px solid' : undefined,
            borderColor: 'divider',
          }}
        >
          {cols.map((c) => {
            const meta = c.columnDef.meta as DataGridColumnMeta<T> | undefined;
            const align = meta?.align;
            const accessor = (c as { accessorKey?: string }).accessorKey ?? c.id;
            const raw = (row as Record<string, unknown>)[accessor];
            return (
              <BodyCell
                key={c.id}
                density={density}
                align={align}
                style={{ width: c.getSize(), fontWeight: 600 }}
              >
                {raw == null ? '' : String(raw)}
              </BodyCell>
            );
          })}
        </TableRow>
      ))}
    </>
  );
}
