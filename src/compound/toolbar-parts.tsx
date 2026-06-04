import { useState } from 'react';
import {
  Box,
  Button,
  type ButtonProps,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  type TextFieldProps,
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
import { useDebouncedFilter } from '../hooks/useDebouncedFilter';
import { useDataGridContext } from './context';

export type DataGridQuickFilterProps = Omit<TextFieldProps, 'value' | 'onChange'>;

const QUICK_FILTER_DEBOUNCE_MS = 500;

export function DataGridQuickFilter({
  placeholder = 'Quick search…',
  size = 'small',
  sx,
  InputProps,
  ...rest
}: DataGridQuickFilterProps) {
  const { state, setters } = useDataGridContext();
  // local value keeps typing instant; the global-filter scan is debounced and
  // committed inside a transition (see useDebouncedFilter).
  const { value: local, setValue: setLocal, isPending } = useDebouncedFilter(
    state.globalFilter,
    setters.setGlobalFilter,
    QUICK_FILTER_DEBOUNCE_MS,
  );

  return (
    <TextField
      {...rest}
      size={size}
      placeholder={placeholder}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      InputProps={{
        ...InputProps,
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" />
          </InputAdornment>
        ),
        endAdornment: local ? (
          <InputAdornment position="end">
            {isPending ? (
              <CircularProgress size={16} aria-label="Filtering" />
            ) : (
              <IconButton size="small" onClick={() => setLocal('')} aria-label="Clear search">
                <ClearIcon fontSize="small" />
              </IconButton>
            )}
          </InputAdornment>
        ) : null,
      }}
      sx={{ minWidth: 220, ...sx }}
    />
  );
}

export function DataGridFilterToggle({
  size = 'small',
  children = 'Filters',
  ...rest
}: ButtonProps) {
  const { state, setters } = useDataGridContext();
  const activeCount = state.columnFilters.length;
  return (
    <Tooltip
      title={
        activeCount > 0
          ? `${activeCount} column ${activeCount === 1 ? 'filter' : 'filters'} active${state.showFilters ? '' : ' (row hidden)'}`
          : state.showFilters
            ? 'Hide column filters'
            : 'Show column filters'
      }
    >
      <Button
        {...rest}
        size={size}
        variant={state.showFilters || activeCount > 0 ? 'contained' : 'text'}
        startIcon={<FilterAltIcon />}
        onClick={() => setters.setShowFilters(!state.showFilters)}
      >
        {children}
        {activeCount > 0 ? ` (${activeCount})` : ''}
      </Button>
    </Tooltip>
  );
}

export function DataGridAdvancedFilter({ size = 'small', ...rest }: ButtonProps) {
  const { table, state, setters } = useDataGridContext();
  const [open, setOpen] = useState(false);
  const count = state.advancedFilter ? countRules(state.advancedFilter) : 0;
  return (
    <>
      <Button
        {...rest}
        size={size}
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

export function DataGridColumnsButton(buttonProps: ButtonProps) {
  const { table } = useDataGridContext();
  return <ColumnsMenu table={table} buttonProps={buttonProps} />;
}

export function DataGridGroupByButton(buttonProps: ButtonProps) {
  const { table } = useDataGridContext();
  const grouping = table.getState().grouping;
  return (
    <>
      <GroupByMenu table={table} buttonProps={buttonProps} />
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

export function DataGridDensityButton(buttonProps: ButtonProps) {
  const { state, setters } = useDataGridContext();
  return <DensityMenu density={state.density} onChange={setters.setDensity} buttonProps={buttonProps} />;
}

export function DataGridExportButton({
  size = 'small',
  variant = 'text',
  children = 'Export CSV',
  ...rest
}: ButtonProps) {
  const { table, csvFileName } = useDataGridContext();
  return (
    <Button
      {...rest}
      size={size}
      variant={variant}
      startIcon={<FileDownloadIcon />}
      onClick={() => exportTableToCsv(table, csvFileName)}
    >
      {children}
    </Button>
  );
}

function countRules(g: AdvancedFilterGroup): number {
  let n = 0;
  for (const r of g.rules) n += 'combinator' in r ? countRules(r) : 1;
  return n;
}
