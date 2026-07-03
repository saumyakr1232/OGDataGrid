import { useState, type ReactNode } from 'react';
import {
  Box,
  Button,
  type ButtonProps,
  CircularProgress,
  IconButton,
  type IconButtonProps,
  InputAdornment,
  Menu,
  TextField,
  type TextFieldProps,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ClearIcon from '@mui/icons-material/Clear';
import WrapTextIcon from '@mui/icons-material/WrapText';
import MoreVertIcon from '@mui/icons-material/MoreVert';

import { ColumnsMenu } from '../components/ColumnsMenu';
import { DensityMenu } from '../components/DensityMenu';
import { exportTableToCsv } from '../export/toCsv';
import { useDebouncedFilter } from '../hooks/useDebouncedFilter';
import { IconOnlyOverrideContext, useDataGridContext, useToolbarIconOnly } from './context';

export type DataGridQuickFilterProps = Omit<TextFieldProps, 'value' | 'onChange'>;

const QUICK_FILTER_DEBOUNCE_MS = 500;

const ICON_ONLY_SX = { minWidth: 0, px: 1 } as const;

export type ToolbarButtonProps = ButtonProps & { iconOnly?: boolean };

export function DataGridQuickFilter({
  placeholder = 'Quick search…',
  size = 'small',
  sx,
  InputProps,
  ...rest
}: DataGridQuickFilterProps) {
  const { state, setters } = useDataGridContext();
  // Local value keeps typing instant; the filter commit is debounced.
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
  iconOnly: iconOnlyProp,
  sx,
  ...rest
}: ToolbarButtonProps) {
  const { state, setters } = useDataGridContext();
  const iconOnly = useToolbarIconOnly(iconOnlyProp);
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
        startIcon={iconOnly ? undefined : <FilterAltIcon />}
        onClick={() => setters.setShowFilters(!state.showFilters)}
        aria-label="Filters"
        sx={iconOnly ? { ...ICON_ONLY_SX, ...sx } : sx}
      >
        {iconOnly ? (
          <FilterAltIcon fontSize="small" />
        ) : (
          <>
            {children}
            {activeCount > 0 ? ` (${activeCount})` : ''}
          </>
        )}
      </Button>
    </Tooltip>
  );
}

export function DataGridColumnsButton({ iconOnly: iconOnlyProp, ...buttonProps }: ToolbarButtonProps) {
  const { table } = useDataGridContext();
  const iconOnly = useToolbarIconOnly(iconOnlyProp);
  return <ColumnsMenu table={table} buttonProps={buttonProps} iconOnly={iconOnly} />;
}

export function DataGridDensityButton({ iconOnly: iconOnlyProp, ...buttonProps }: ToolbarButtonProps) {
  const { state, setters } = useDataGridContext();
  const iconOnly = useToolbarIconOnly(iconOnlyProp);
  return (
    <DensityMenu
      density={state.density}
      onChange={setters.setDensity}
      buttonProps={buttonProps}
      iconOnly={iconOnly}
    />
  );
}

export function DataGridWrapToggle({
  size = 'small',
  children = 'Wrap',
  iconOnly: iconOnlyProp,
  sx,
  ...rest
}: ToolbarButtonProps) {
  const { state, setters } = useDataGridContext();
  const iconOnly = useToolbarIconOnly(iconOnlyProp);
  return (
    <Tooltip title={state.wrapText ? 'Disable cell wrapping' : 'Enable cell wrapping'}>
      <Button
        {...rest}
        size={size}
        variant={state.wrapText ? 'contained' : 'text'}
        startIcon={iconOnly ? undefined : <WrapTextIcon />}
        onClick={() => setters.setWrapText(!state.wrapText)}
        aria-label="Wrap text"
        sx={iconOnly ? { ...ICON_ONLY_SX, ...sx } : sx}
      >
        {iconOnly ? <WrapTextIcon fontSize="small" /> : children}
      </Button>
    </Tooltip>
  );
}

export interface DataGridOverflowMenuProps {
  children?: ReactNode;
  tooltip?: string;
  /** Trigger glyph; defaults to a vertical 3-dot icon. */
  icon?: ReactNode;
  buttonProps?: IconButtonProps;
  /** Defaults to false — labels read better in a vertical menu. */
  iconOnly?: boolean;
}

/** A 3-dot button that reveals its children stacked in a menu. */
export function DataGridOverflowMenu({
  children,
  tooltip = 'More actions',
  icon,
  buttonProps,
  iconOnly = false,
}: DataGridOverflowMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);
  return (
    <>
      <Tooltip title={tooltip}>
        <IconButton
          size="small"
          aria-label={tooltip}
          onClick={(e) => setAnchor(e.currentTarget)}
          {...buttonProps}
        >
          {icon ?? <MoreVertIcon />}
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box
          onClick={close}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 0.5,
            px: 1,
            py: 0.5,
            minWidth: 180,
            '& > *': { justifyContent: 'flex-start' },
          }}
        >
          <IconOnlyOverrideContext.Provider value={iconOnly}>
            {children}
          </IconOnlyOverrideContext.Provider>
        </Box>
      </Menu>
    </>
  );
}

export function DataGridExportButton({
  size = 'small',
  variant = 'text',
  children = 'Export CSV',
  iconOnly: iconOnlyProp,
  sx,
  ...rest
}: ToolbarButtonProps) {
  const { table, csvFileName } = useDataGridContext();
  const iconOnly = useToolbarIconOnly(iconOnlyProp);
  const button = (
    <Button
      {...rest}
      size={size}
      variant={variant}
      startIcon={iconOnly ? undefined : <FileDownloadIcon />}
      onClick={() => exportTableToCsv(table, csvFileName)}
      aria-label="Export CSV"
      sx={iconOnly ? { ...ICON_ONLY_SX, ...sx } : sx}
    >
      {iconOnly ? <FileDownloadIcon fontSize="small" /> : children}
    </Button>
  );
  return iconOnly ? <Tooltip title="Export CSV">{button}</Tooltip> : button;
}
