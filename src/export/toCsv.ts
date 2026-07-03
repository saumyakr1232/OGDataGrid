import type { Row, Table } from '@tanstack/react-table';
import type { DataGridColumnMeta } from '../types';

// Leading chars that spreadsheets interpret as a formula (CSV injection).
const FORMULA_LEAD = /^[=+\-@\t\r]/;

function csvEscape(v: unknown): string {
  if (v == null) return '';
  // Numbers/booleans can't be formula payloads; don't quote-prefix negatives.
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  let s = String(v);
  // Quote prefix forces the cell to be read as literal text.
  if (FORMULA_LEAD.test(s)) s = `'${s}`;
  if (/["\n\r,]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
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
