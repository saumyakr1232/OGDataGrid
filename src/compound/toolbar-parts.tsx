import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import TuneIcon from '@mui/icons-material/Tune';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ClearIcon from '@mui/icons-material/Clear';

import { ColumnsMenu } from '../components/ColumnsMenu';
import { GroupByMenu } from '../components/GroupByMenu';
import { DensityMenu } from '../components/DensityMenu';
import { AdvancedFilterPanel } from '../components/AdvancedFilterPanel';
import { exportTableToCsv } from '../export/toCsv';
import type { AdvancedFilterGroup } from '../types';
import { useDataGridContext } from './context';

export function DataGridQuickFilter({ placeholder = 'Quick search…' }: { placeholder?: string }) {
  const { state, setters } = useDataGridContext();
  const [local, setLocal] = useState(state.globalFilter);
  useEffect(() => setLocal(state.globalFilter), [state.globalFilter]);
  useEffect(() => {
    const t = setTimeout(() => setters.setGlobalFilter(local), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  return (
    <TextField
      size="small"
      placeholder={placeholder}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" />
          </InputAdornment>
        ),
        endAdornment: local ? (
          <InputAdornment position="end">
            <IconButton size="small" onClick={() => setLocal('')} aria-label="Clear search">
              <ClearIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ) : null,
      }}
      sx={{ minWidth: 220 }}
    />
  );
}

export function DataGridFilterToggle() {
  const { state, setters } = useDataGridContext();
  return (
    <Tooltip title={state.showFilters ? 'Hide column filters' : 'Show column filters'}>
      <Button
        size="small"
        variant={state.showFilters ? 'contained' : 'text'}
        startIcon={<FilterAltIcon />}
        onClick={() => setters.setShowFilters(!state.showFilters)}
      >
        Filters
      </Button>
    </Tooltip>
  );
}

export function DataGridAdvancedFilter() {
  const { table, state, setters } = useDataGridContext();
  const [open, setOpen] = useState(false);
  const count = state.advancedFilter ? countRules(state.advancedFilter) : 0;
  return (
    <>
      <Button
        size="small"
        variant={count > 0 ? 'contained' : 'text'}
        startIcon={<TuneIcon />}
        onClick={() => setOpen(true)}
      >
        Advanced{count > 0 ? ` (${count})` : ''}
      </Button>
      <AdvancedFilterPanel
        open={open}
        onClose={() => setOpen(false)}
        table={table}
        value={state.advancedFilter}
        onChange={setters.setAdvancedFilter}
      />
    </>
  );
}

export function DataGridColumnsButton() {
  const { table } = useDataGridContext();
  return <ColumnsMenu table={table} />;
}

export function DataGridGroupByButton() {
  const { table } = useDataGridContext();
  const grouping = table.getState().grouping;
  return (
    <>
      <GroupByMenu table={table} />
      {grouping.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
          {grouping.map((g) => (
            <Chip
              key={g}
              size="small"
              label={String(table.getColumn(g)?.columnDef.header ?? g)}
              onDelete={() => table.getColumn(g)?.toggleGrouping()}
            />
          ))}
        </Box>
      )}
    </>
  );
}

export function DataGridDensityButton() {
  const { state, setters } = useDataGridContext();
  return <DensityMenu density={state.density} onChange={setters.setDensity} />;
}

export function DataGridExportButton() {
  const { table, csvFileName } = useDataGridContext();
  return (
    <Button
      size="small"
      startIcon={<FileDownloadIcon />}
      onClick={() => exportTableToCsv(table, csvFileName)}
      variant="text"
    >
      Export CSV
    </Button>
  );
}

function countRules(g: AdvancedFilterGroup): number {
  let n = 0;
  for (const r of g.rules) n += 'combinator' in r ? countRules(r) : 1;
  return n;
}
