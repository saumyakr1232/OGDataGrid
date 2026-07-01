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
import { useDataGridContext } from './context';

export type DataGridQuickFilterProps = Omit<TextFieldProps, 'value' | 'onChange'>;

const QUICK_FILTER_DEBOUNCE_MS = 500;

// Shrinks a tool button down to just its icon (drops the label's width).
const ICON_ONLY_SX = { minWidth: 0, px: 1 } as const;

/** Toolbar button props plus a per-part override for the toolbar `iconOnly` config. */
export type ToolbarButtonProps = ButtonProps & { iconOnly?: boolean };

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
  iconOnly: iconOnlyProp,
  sx,
  ...rest
}: ToolbarButtonProps) {
  const { state, setters, iconOnly: ctxIconOnly } = useDataGridContext();
  const iconOnly = iconOnlyProp ?? ctxIconOnly;
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
  const { table, iconOnly: ctxIconOnly } = useDataGridContext();
  return <ColumnsMenu table={table} buttonProps={buttonProps} iconOnly={iconOnlyProp ?? ctxIconOnly} />;
}

export function DataGridDensityButton({ iconOnly: iconOnlyProp, ...buttonProps }: ToolbarButtonProps) {
  const { state, setters, iconOnly: ctxIconOnly } = useDataGridContext();
  return (
    <DensityMenu
      density={state.density}
      onChange={setters.setDensity}
      buttonProps={buttonProps}
      iconOnly={iconOnlyProp ?? ctxIconOnly}
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
  const { state, setters, iconOnly: ctxIconOnly } = useDataGridContext();
  const iconOnly = iconOnlyProp ?? ctxIconOnly;
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
  /** Controls to tuck behind the 3-dot button — toolbar parts, buttons, chips… */
  children?: ReactNode;
  tooltip?: string;
  /** Override the trigger glyph (defaults to a vertical 3-dot icon). */
  icon?: ReactNode;
  buttonProps?: IconButtonProps;
}

/**
 * A 3-dot overflow button that reveals its children in a menu. Children are
 * stacked vertically and stretched, so the existing toolbar parts (Density,
 * Wrap, Export, …) drop straight in. Each child closes the menu on click.
 */
export function DataGridOverflowMenu({
  children,
  tooltip = 'More actions',
  icon,
  buttonProps,
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
          {children}
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
  const { table, csvFileName, iconOnly: ctxIconOnly } = useDataGridContext();
  const iconOnly = iconOnlyProp ?? ctxIconOnly;
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
