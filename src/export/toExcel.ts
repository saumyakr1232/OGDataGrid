import type { Row, Table } from '@tanstack/react-table';
import type { DataGridColumnMeta } from '../types';

/**
 * Lazy-load exceljs and emit a styled .xlsx of the current visible row model.
 * Honours sort, filter, grouping/aggregation, and visible columns.
 */
export async function exportTableToExcel<T>(table: Table<T>, fileName: string) {
  const ExcelJS = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Data');

  const cols = table.getVisibleLeafColumns();
  ws.columns = cols.map((c) => ({
    header: String(c.columnDef.header ?? c.id),
    key: c.id,
    width: Math.min(40, Math.max(10, Math.round((c.getSize() || 80) / 7))),
  }));

  // Style header row
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEEEEEE' },
  };
  headerRow.alignment = { vertical: 'middle' };

  const writeRow = (row: Row<T>) => {
    const obj: Record<string, unknown> = {};
    for (const c of cols) {
      const meta = c.columnDef.meta as DataGridColumnMeta<T> | undefined;
      let v: unknown;
      if (row.getIsGrouped() && c.id === row.groupingColumnId) {
        v = `${row.getValue(c.id)} (${row.subRows.length})`;
      } else if (row.getIsGrouped()) {
        v = row.getValue(c.id);
      } else if (meta?.exportValue) {
        v = meta.exportValue(row.original);
      } else {
        v = row.getValue(c.id);
      }
      // Normalise Dates / undefined for exceljs.
      if (v === undefined) v = null;
      obj[c.id] = v as never;
    }
    ws.addRow(obj);
    if (row.subRows && row.subRows.length > 0 && row.getIsExpanded()) {
      row.subRows.forEach(writeRow);
    }
  };

  table.getRowModel().rows.forEach(writeRow);

  // AutoFilter on the header range
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: cols.length },
  };
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
