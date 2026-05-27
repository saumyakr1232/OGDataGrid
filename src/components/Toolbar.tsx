import {
  Box,
  Button,
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
import InsertChartIcon from '@mui/icons-material/InsertChart';
import PivotTableChartIcon from '@mui/icons-material/PivotTableChart';
import GridOnIcon from '@mui/icons-material/GridOn';
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
  enableGrouping,
  enableCsvExport,
  onExportCsv,
  enableCharts,
  onNewChart,
  enableExcelExport,
  onExportExcel,
  enablePivot,
  onOpenPivot,
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
  enableGrouping: boolean;
  enableCsvExport: boolean;
  onExportCsv: () => void;
  enableCharts: boolean;
  onNewChart: () => void;
  enableExcelExport: boolean;
  onExportExcel: () => void;
  enablePivot: boolean;
  onOpenPivot: () => void;
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

  return (
    <GridToolbar>
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
      <Button
        size="small"
        variant={advCount > 0 ? 'contained' : 'text'}
        startIcon={<TuneIcon />}
        onClick={onOpenAdvanced}
      >
        Advanced
        {advCount > 0 ? ` (${advCount})` : ''}
      </Button>
      <ColumnsMenu table={table} />
      {enableGrouping && <GroupByMenu table={table} />}
      {enablePivot && (
        <Button
          size="small"
          startIcon={<PivotTableChartIcon />}
          onClick={onOpenPivot}
          variant="text"
        >
          Pivot
        </Button>
      )}
      {enableCharts && (
        <Button
          size="small"
          startIcon={<InsertChartIcon />}
          onClick={onNewChart}
          variant="text"
        >
          New chart
        </Button>
      )}
      <DensityMenu density={density} onChange={onDensityChange} />
      {enableCsvExport && (
        <Button size="small" startIcon={<FileDownloadIcon />} onClick={onExportCsv} variant="text">
          CSV
        </Button>
      )}
      {enableExcelExport && (
        <Button size="small" startIcon={<GridOnIcon />} onClick={onExportExcel} variant="text">
          Excel
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
