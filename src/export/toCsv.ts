import type { Row, Table } from '@tanstack/react-table';
import type { DataGridColumnMeta } from '../types';

// Cells whose text begins with one of these are interpreted as a formula by
// Excel / Google Sheets when the CSV is opened, enabling data exfiltration
// (=HYPERLINK / =IMPORTXML) or DDE command execution (=cmd|'/c …'!A1).
const FORMULA_LEAD = /^[=+\-@\t\r]/;

function csvEscape(v: unknown): string {
  if (v == null) return '';
  // Numbers and booleans can never be a formula payload, so never mangle them
  // (avoids prefixing a legitimate negative number with a quote).
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  let s = String(v);
  // Defuse spreadsheet formula injection by prefixing a single quote, which
  // forces the cell to be treated as literal text on open.
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
