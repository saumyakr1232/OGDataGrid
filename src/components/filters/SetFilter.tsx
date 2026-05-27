import {
  Box,
  Button,
  Checkbox,
  IconButton,
  ListItemText,
  Popover,
  TextField,
  Typography,
} from '@mui/material';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import { useMemo, useState } from 'react';
import type { Column, Table } from '@tanstack/react-table';

/**
 * Excel-style "set" filter — derives distinct values from the column's
 * pre-filter row model and lets the user check the subset they want to keep.
 */
export function SetFilter<T>({
  column,
  table,
}: {
  column: Column<T, unknown>;
  table: Table<T>;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [query, setQuery] = useState('');

  // Read distinct values from the PRE-filtered model, so options don't shrink
  // as the user toggles checkboxes for this column.
  const facetValues = useMemo<unknown[]>(() => {
    const set = new Set<unknown>();
    for (const row of table.getPreFilteredRowModel().rows) {
      set.add(row.getValue(column.id));
    }
    return Array.from(set);
  }, [column.id, table]);

  const filterValue = (column.getFilterValue() as unknown[]) ?? null;
  const allSelected = filterValue == null;
  const selectedSet = new Set(filterValue ?? facetValues);

  const visibleValues = facetValues.filter((v) =>
    String(v ?? '').toLowerCase().includes(query.toLowerCase()),
  );

  const setFilter = (next: Set<unknown>) => {
    if (next.size === facetValues.length) {
      column.setFilterValue(undefined);
    } else if (next.size === 0) {
      column.setFilterValue([]);
    } else {
      column.setFilterValue(Array.from(next));
    }
  };

  return (
    <>
      <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)} aria-label={`Set filter for ${column.id}`}>
        <FilterAltIcon
          fontSize="small"
          color={!allSelected ? 'primary' : 'inherit'}
        />
      </IconButton>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        PaperProps={{ sx: { width: 260 } }}
      >
        <Box sx={{ p: 1.5 }}>
          <TextField
            size="small"
            placeholder="Search…"
            fullWidth
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Button size="small" onClick={() => setFilter(new Set(facetValues))}>
              Select all
            </Button>
            <Button size="small" onClick={() => setFilter(new Set())}>
              Clear
            </Button>
          </Box>
          <Box sx={{ maxHeight: 240, overflow: 'auto', mt: 1 }}>
            {visibleValues.length === 0 && (
              <Typography variant="caption" color="text.secondary">No matches</Typography>
            )}
            {visibleValues.map((v, i) => {
              const checked = selectedSet.has(v);
              return (
                <Box
                  key={i}
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
                  onClick={() => {
                    const next = new Set(selectedSet);
                    if (checked) next.delete(v);
                    else next.add(v);
                    setFilter(next);
                  }}
                >
                  <Checkbox size="small" checked={checked} />
                  <ListItemText
                    primaryTypographyProps={{ noWrap: true, variant: 'body2' }}
                    primary={v == null || v === '' ? <em>(blank)</em> : String(v)}
                  />
                </Box>
              );
            })}
          </Box>
        </Box>
      </Popover>
    </>
  );
}
