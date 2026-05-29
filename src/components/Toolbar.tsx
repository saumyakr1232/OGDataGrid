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
import { useEffect, useState } from 'react';
import type { Table } from '@tanstack/react-table';
import { ColumnsMenu } from './ColumnsMenu';
import { GroupByMenu } from './GroupByMenu';
import { DensityMenu } from './DensityMenu';
import { GridToolbar } from '../styled';
import type { AdvancedFilterGroup, Density } from '../types';

export function Toolbar<T>({
  table,
  showFilters,
  onToggleFilters,
  globalFilter,
  onGlobalFilterChange,
  onOpenAdvanced,
  advancedFilter,
  density,
  onDensityChange,
  tools,
  onExportCsv,
  extras,
}: {
  table: Table<T>;
  showFilters: boolean;
  onToggleFilters: () => void;
  globalFilter: string;
  onGlobalFilterChange: (v: string) => void;
  onOpenAdvanced: () => void;
  advancedFilter: AdvancedFilterGroup | null;
  density: Density;
  onDensityChange: (d: Density) => void;
  tools: {
    quickFilter: boolean;
    columnFilters: boolean;
    advancedFilter: boolean;
    columns: boolean;
    groupBy: boolean;
    density: boolean;
    export: boolean;
  };
  onExportCsv: () => void;
  extras?: React.ReactNode;
}) {
  const [local, setLocal] = useState(globalFilter);
  useEffect(() => setLocal(globalFilter), [globalFilter]);
  useEffect(() => {
    const t = setTimeout(() => onGlobalFilterChange(local), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  const advCount = advancedFilter ? countRules(advancedFilter) : 0;
  const grouping = table.getState().grouping;

  return (
    <GridToolbar>
      {tools.quickFilter && (
        <TextField
          size="small"
          placeholder="Quick search…"
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
      )}
      {tools.columnFilters && (
        <Tooltip title={showFilters ? 'Hide column filters' : 'Show column filters'}>
          <Button
            size="small"
            variant={showFilters ? 'contained' : 'text'}
            startIcon={<FilterAltIcon />}
            onClick={onToggleFilters}
          >
            Filters
          </Button>
        </Tooltip>
      )}
      {tools.advancedFilter && (
        <Button
          size="small"
          variant={advCount > 0 ? 'contained' : 'text'}
          startIcon={<TuneIcon />}
          onClick={onOpenAdvanced}
        >
          Advanced
          {advCount > 0 ? ` (${advCount})` : ''}
        </Button>
      )}
      {tools.columns && <ColumnsMenu table={table} />}
      {tools.groupBy && <GroupByMenu table={table} />}
      {tools.groupBy && grouping.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 0.5,
          }}
        >
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
      {tools.density && <DensityMenu density={density} onChange={onDensityChange} />}
      {tools.export && (
        <Button size="small" startIcon={<FileDownloadIcon />} onClick={onExportCsv} variant="text">
          Export CSV
        </Button>
      )}
      <Box sx={{ flex: 1 }} />
      {extras}
    </GridToolbar>
  );
}

function countRules(g: AdvancedFilterGroup): number {
  let n = 0;
  for (const r of g.rules) {
    if ('combinator' in r) n += countRules(r);
    else n += 1;
  }
  return n;
}
