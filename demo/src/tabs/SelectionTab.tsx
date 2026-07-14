import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  DataGrid,
  type CellClickParams,
  type DataGridProps,
  type DataGridState,
} from 'og-data-grid';
import { getSales, SAVED_CONFIG, type Sale } from '../data/sales';

type SelMode = 'none' | 'single' | 'multi';

/**
 * Selection modes, cell clicks, and driving the grid from outside via the
 * controlled `state` prop (re-applied whenever the object reference changes),
 * with `onStateChange` reporting back.
 */
export function SelectionTab() {
  const [selMode, setSelMode] = useState<SelMode>('multi');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastClick, setLastClick] = useState('');
  // Controlled slices pushed into the grid; each push must be a FRESH object.
  const [gridState, setGridState] = useState<Partial<DataGridState> | undefined>(undefined);
  const [snapshot, setSnapshot] = useState('');

  const rows = getSales(500);

  const selection: DataGridProps<Sale>['selection'] =
    selMode === 'none' ? undefined : { mode: selMode, onChange: setSelectedIds };

  const handleStateChange = (s: DataGridState) => {
    setSnapshot(
      JSON.stringify(
        {
          sorting: s.sorting,
          columnFilters: s.columnFilters,
          globalFilter: s.globalFilter,
          selectedRows: Object.keys(s.rowSelection).length,
          page: s.pagination.pageIndex,
        },
        null,
        2,
      ),
    );
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={selMode}
          onChange={(_, v: SelMode | null) => {
            if (!v) return;
            setSelMode(v);
            setSelectedIds([]);
          }}
          aria-label="Selection mode"
        >
          <ToggleButton value="none">No selection</ToggleButton>
          <ToggleButton value="single">Single</ToggleButton>
          <ToggleButton value="multi">Multi</ToggleButton>
        </ToggleButtonGroup>
        {selectedIds.length > 0 && (
          <Chip
            size="small"
            color="primary"
            label={`${selectedIds.length} selected: ${selectedIds.slice(0, 5).join(', ')}${selectedIds.length > 5 ? '…' : ''}`}
            onDelete={() => setGridState({ rowSelection: {} })}
          />
        )}
        {lastClick && (
          <Typography variant="body2" color="text.secondary">
            Last cell clicked: {lastClick}
          </Typography>
        )}
      </Stack>

      {/* Drive the grid from outside: each button passes a fresh `state` object. */}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Button
          size="small"
          variant="outlined"
          onClick={() => setGridState({ sorting: [{ id: 'revenue', desc: true }] })}
        >
          Sort revenue desc
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={() => setGridState({ columnFilters: [{ id: 'region', value: 'North' }] })}
        >
          Filter region = North
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={() => setGridState({ globalFilter: 'Widget' })}
        >
          Search “Widget”
        </Button>
        <Button
          size="small"
          onClick={() =>
            setGridState({ sorting: [], columnFilters: [], globalFilter: '', rowSelection: {} })
          }
        >
          Reset
        </Button>
      </Stack>

      <DataGrid<Sale>
        key={selMode} // remount when the selection column set changes
        columns={SAVED_CONFIG}
        rows={rows}
        getRowId={(r) => r.id}
        selection={selection}
        state={gridState}
        onStateChange={handleStateChange}
        onCellClick={(p: CellClickParams<Sale>) =>
          setLastClick(`${p.columnId} = ${String(p.value)} (row ${p.rowId})`)
        }
        height={480}
      />

      {snapshot && (
        <Box>
          <Typography variant="caption" color="text.secondary">
            onStateChange snapshot
          </Typography>
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 1.5,
              bgcolor: 'action.hover',
              borderRadius: 1,
              fontSize: 12,
              overflow: 'auto',
              maxHeight: 180,
            }}
          >
            {snapshot}
          </Box>
        </Box>
      )}
    </Stack>
  );
}
