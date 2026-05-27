import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Table } from '@tanstack/react-table';
import type { AggregationFn } from '../types';
import type { PivotConfig } from '../pivot/buildPivot';

const AGG_FNS: AggregationFn[] = ['sum', 'avg', 'min', 'max', 'count', 'uniqueCount'];

export function PivotPanel<T>({
  open,
  onClose,
  table,
  enabled,
  onEnabledChange,
  config,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  table: Table<T>;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  config: PivotConfig;
  onChange: (cfg: PivotConfig) => void;
}) {
  const leaves = table.getAllLeafColumns().filter((c) => !c.id.startsWith('__'));
  const label = (id: string) => String(table.getColumn(id)?.columnDef.header ?? id);

  const used = new Set([
    ...config.rowGroupCols,
    ...config.colGroupCols,
    ...config.valueCols.map((v) => v.columnId),
  ]);

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 420 } }}>
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h6" sx={{ flex: 1 }}>Pivot</Typography>
          <Typography variant="caption" sx={{ mr: 1 }}>Enabled</Typography>
          <Switch checked={enabled} onChange={(e) => onEnabledChange(e.target.checked)} />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Pivot the dataset into row groups × column groups × aggregated values.
        </Typography>
        <Stack spacing={2} sx={{ flex: 1, overflow: 'auto', pr: 0.5 }}>
          <Section
            title="Row groups"
            items={config.rowGroupCols}
            onAdd={() => {
              const next = leaves.find((c) => !used.has(c.id));
              if (next) onChange({ ...config, rowGroupCols: [...config.rowGroupCols, next.id] });
            }}
            onChangeItem={(i, v) => {
              const next = [...config.rowGroupCols];
              next[i] = v;
              onChange({ ...config, rowGroupCols: next });
            }}
            onRemove={(i) =>
              onChange({ ...config, rowGroupCols: config.rowGroupCols.filter((_, j) => j !== i) })
            }
            options={leaves.map((c) => ({ id: c.id, label: label(c.id) }))}
          />
          <Divider />
          <Section
            title="Column groups (optional)"
            items={config.colGroupCols}
            onAdd={() => {
              const next = leaves.find((c) => !used.has(c.id));
              if (next) onChange({ ...config, colGroupCols: [...config.colGroupCols, next.id] });
            }}
            onChangeItem={(i, v) => {
              const next = [...config.colGroupCols];
              next[i] = v;
              onChange({ ...config, colGroupCols: next });
            }}
            onRemove={(i) =>
              onChange({ ...config, colGroupCols: config.colGroupCols.filter((_, j) => j !== i) })
            }
            options={leaves.map((c) => ({ id: c.id, label: label(c.id) }))}
          />
          <Divider />
          <Box>
            <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ flex: 1 }}>Values</Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => {
                  const next = leaves.find((c) => !used.has(c.id));
                  if (next)
                    onChange({
                      ...config,
                      valueCols: [...config.valueCols, { columnId: next.id, aggregation: 'sum' }],
                    });
                }}
              >
                Add
              </Button>
            </Stack>
            {config.valueCols.length === 0 && (
              <Typography variant="caption" color="text.secondary">
                Add at least one value column.
              </Typography>
            )}
            {config.valueCols.map((vc, i) => (
              <Stack key={i} direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center' }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Column</InputLabel>
                  <Select
                    label="Column"
                    value={vc.columnId}
                    onChange={(e) => {
                      const next = [...config.valueCols];
                      next[i] = { ...vc, columnId: String(e.target.value) };
                      onChange({ ...config, valueCols: next });
                    }}
                  >
                    {leaves.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        <ListItemText>{label(c.id)}</ListItemText>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ width: 120 }}>
                  <InputLabel>Agg</InputLabel>
                  <Select
                    label="Agg"
                    value={vc.aggregation}
                    onChange={(e) => {
                      const next = [...config.valueCols];
                      next[i] = { ...vc, aggregation: e.target.value as AggregationFn };
                      onChange({ ...config, valueCols: next });
                    }}
                  >
                    {AGG_FNS.map((f) => (
                      <MenuItem key={f} value={f}>{f}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <IconButton size="small" onClick={() => {
                  onChange({
                    ...config,
                    valueCols: config.valueCols.filter((_, j) => j !== i),
                  });
                }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </Box>
        </Stack>
        <Divider sx={{ my: 1 }} />
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button
            onClick={() => {
              onChange({ rowGroupCols: [], colGroupCols: [], valueCols: [] });
              onEnabledChange(false);
            }}
            color="warning"
          >
            Clear
          </Button>
          <Button onClick={onClose} variant="contained">Done</Button>
        </Box>
        {enabled && (
          <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <Chip size="small" label={`${config.rowGroupCols.length} row group(s)`} />
            <Chip size="small" label={`${config.colGroupCols.length} col group(s)`} />
            <Chip size="small" label={`${config.valueCols.length} value(s)`} />
          </Box>
        )}
      </Box>
    </Drawer>
  );
}

function Section({
  title,
  items,
  onAdd,
  onChangeItem,
  onRemove,
  options,
}: {
  title: string;
  items: string[];
  onAdd: () => void;
  onChangeItem: (i: number, v: string) => void;
  onRemove: (i: number) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle2" sx={{ flex: 1 }}>{title}</Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={onAdd}>Add</Button>
      </Stack>
      {items.length === 0 && (
        <Typography variant="caption" color="text.secondary">None</Typography>
      )}
      {items.map((id, i) => (
        <Stack key={i} direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center' }}>
          <FormControl size="small" sx={{ flex: 1 }}>
            <InputLabel>Column</InputLabel>
            <Select label="Column" value={id} onChange={(e) => onChangeItem(i, String(e.target.value))}>
              {options.map((o) => (
                <MenuItem key={o.id} value={o.id}>
                  <ListItemText>{o.label}</ListItemText>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <IconButton size="small" onClick={() => onRemove(i)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      ))}
    </Box>
  );
}
