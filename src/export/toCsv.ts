import type { Row, Table } from '@tanstack/react-table';
import type { DataGridColumnMeta } from '../types';

function csvEscape(v: unknown): string {
  if (v == null) return '';
  const s = typeof v === 'string' ? v : String(v);
  if (/["\n,]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportTableToCsv<T>(table: Table<T>, fileName: string) {
  const cols = table.getVisibleLeafColumns();
  const header = cols.map((c) => csvEscape(String(c.columnDef.header ?? c.id))).join(',');
  const rows: string[] = [header];

  const writeRow = (row: Row<T>) => {
    const cells = cols.map((c) => {
      const meta = c.columnDef.meta as DataGridColumnMeta<T> | undefined;
      const raw = meta?.exportValue
        ? meta.exportValue(row.original)
        : row.getValue(c.id);
      return csvEscape(raw);
    });
    rows.push(cells.join(','));
    if (row.subRows && row.subRows.length > 0 && row.getIsExpanded()) {
      row.subRows.forEach(writeRow);
    }
  };

  const model = table.getRowModel();
  model.rows.forEach(writeRow);

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
