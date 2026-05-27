import { Box, Chip, Typography } from '@mui/material';
import type { Table } from '@tanstack/react-table';
import type { CellRange } from '../hooks/useCellInteraction';

interface Stats {
  count: number;
  numericCount: number;
  sum: number;
  avg: number | null;
  min: number | null;
  max: number | null;
}

function computeStats<T>(table: Table<T>, range: CellRange | null): Stats {
  const empty: Stats = {
    count: 0,
    numericCount: 0,
    sum: 0,
    avg: null,
    min: null,
    max: null,
  };
  if (!range) return empty;
  const rows = table.getRowModel().rows;
  const cols = table.getVisibleLeafColumns();
  let count = 0;
  let numericCount = 0;
  let sum = 0;
  let min: number | null = null;
  let max: number | null = null;
  for (let r = range.startRow; r <= range.endRow; r++) {
    const row = rows[r];
    if (!row) continue;
    for (let c = range.startCol; c <= range.endCol; c++) {
      const col = cols[c];
      if (!col) continue;
      count++;
      const v = row.getValue(col.id);
      const n = typeof v === 'number' ? v : Number(v);
      if (!Number.isNaN(n) && v != null && v !== '') {
        numericCount++;
        sum += n;
        if (min === null || n < min) min = n;
        if (max === null || n > max) max = n;
      }
    }
  }
  return {
    count,
    numericCount,
    sum,
    avg: numericCount > 0 ? sum / numericCount : null,
    min,
    max,
  };
}

const fmt = (n: number) =>
  n.toLocaleString(undefined, { maximumFractionDigits: 2 });

export function StatusBar<T>({
  table,
  range,
}: {
  table: Table<T>;
  range: CellRange | null;
}) {
  const total = table.getPreFilteredRowModel().rows.length;
  const filtered = table.getFilteredRowModel().rows.length;
  const selectedRows = Object.keys(table.getState().rowSelection).length;
  const stats = computeStats(table, range);
  const showStats = stats.numericCount > 1;
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 1.5,
        py: 0.5,
        borderTop: 1,
        borderColor: 'divider',
        background: 'background.default',
        fontSize: 12,
        flexWrap: 'wrap',
        minHeight: 32,
      }}
    >
      <Typography variant="caption" color="text.secondary">
        Rows: {filtered.toLocaleString()}
        {filtered !== total && ` / ${total.toLocaleString()}`}
      </Typography>
      {selectedRows > 0 && (
        <Chip size="small" label={`${selectedRows} selected`} color="primary" variant="outlined" />
      )}
      {range && (
        <Typography variant="caption" color="text.secondary">
          Cells: {stats.count.toLocaleString()}
        </Typography>
      )}
      {showStats && stats.avg != null && stats.min != null && stats.max != null && (
        <>
          <Typography variant="caption" color="text.secondary">Sum: {fmt(stats.sum)}</Typography>
          <Typography variant="caption" color="text.secondary">Avg: {fmt(stats.avg)}</Typography>
          <Typography variant="caption" color="text.secondary">Min: {fmt(stats.min)}</Typography>
          <Typography variant="caption" color="text.secondary">Max: {fmt(stats.max)}</Typography>
        </>
      )}
    </Box>
  );
}
