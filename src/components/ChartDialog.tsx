import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Table } from '@tanstack/react-table';
import type { AggregationFn } from '../types';
import { buildEChartsOption, type ChartConfig, type ChartType } from '../charts/buildOption';

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'bar', label: 'Bar' },
  { value: 'stackedBar', label: 'Stacked bar' },
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
  { value: 'pie', label: 'Pie' },
  { value: 'doughnut', label: 'Doughnut' },
  { value: 'scatter', label: 'Scatter' },
];

const AGG_FNS: AggregationFn[] = ['sum', 'avg', 'min', 'max', 'count', 'uniqueCount'];

// Lazily-loaded echarts module. Resolves on first chart open and shared after.
let echartsPromise: Promise<typeof import('echarts')> | null = null;
function loadEcharts() {
  if (!echartsPromise) {
    echartsPromise = import('echarts');
  }
  return echartsPromise;
}

export function ChartDialog<T>({
  open,
  onClose,
  table,
  initialConfig,
  /** Bumped whenever upstream grid state (filter/sort/group/pagination) changes.
   *  The chart re-renders only when this changes (cheap) or config changes. */
  gridStateVersion,
}: {
  open: boolean;
  onClose: () => void;
  table: Table<T>;
  initialConfig?: Partial<ChartConfig>;
  gridStateVersion: number;
}) {
  const leafCols = table.getAllLeafColumns().filter((c) => !c.id.startsWith('__'));
  const numericLikeCols = leafCols.filter((c) => {
    const sample = table.getRowModel().rows[0];
    if (!sample) return true;
    const v = sample.getValue(c.id);
    return typeof v === 'number' || (v != null && !Number.isNaN(Number(v)));
  });

  const [config, setConfig] = useState<ChartConfig>(() => ({
    type: initialConfig?.type ?? 'bar',
    title: initialConfig?.title ?? '',
    categoryCol: initialConfig?.categoryCol ?? leafCols[0]?.id ?? '',
    seriesCols: initialConfig?.seriesCols ?? (numericLikeCols[0] ? [numericLikeCols[0].id] : []),
    splitByCol: initialConfig?.splitByCol,
    aggregation: initialConfig?.aggregation ?? 'sum',
    legend: initialConfig?.legend ?? true,
    downsample: initialConfig?.downsample ?? true,
    maxPoints: initialConfig?.maxPoints ?? 500,
  }));

  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<import('echarts').ECharts | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Initialise echarts (lazy import) on first open.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void loadEcharts().then((echarts) => {
      if (cancelled || !containerRef.current) return;
      if (!chartRef.current) {
        chartRef.current = echarts.init(containerRef.current);
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Render / update on config or grid state change.
  useEffect(() => {
    if (!loaded || !chartRef.current) return;
    const option = buildEChartsOption(table, config) as unknown as Parameters<import('echarts').ECharts['setOption']>[0];
    chartRef.current.setOption(option, true);
  }, [loaded, table, config, gridStateVersion]);

  // Resize on container resize.
  useEffect(() => {
    if (!loaded || !chartRef.current || !containerRef.current) return;
    const ro = new ResizeObserver(() => {
      chartRef.current?.resize();
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [loaded]);

  // Dispose on close.
  useEffect(() => {
    if (!open && chartRef.current) {
      chartRef.current.dispose();
      chartRef.current = null;
      setLoaded(false);
    }
  }, [open]);

  const exportPng = async () => {
    if (!chartRef.current) return;
    const url = chartRef.current.getDataURL({ pixelRatio: 2, backgroundColor: '#fff' });
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.title || 'chart'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const copyConfig = async () => {
    if (!chartRef.current) return;
    const opt = buildEChartsOption(table, config);
    try {
      await navigator.clipboard.writeText(JSON.stringify(opt, null, 2));
    } catch {
      /* ignore */
    }
  };

  const update = <K extends keyof ChartConfig>(k: K, v: ChartConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const isPie = config.type === 'pie' || config.type === 'doughnut';
  const isScatter = config.type === 'scatter';
  const headerLabel = (id: string) =>
    String(table.getColumn(id)?.columnDef.header ?? id);

  const seriesPlaceholder = useMemo(
    () =>
      isScatter
        ? 'Pick X then Y (first 2 selected)'
        : isPie
          ? 'Pick the single value column'
          : 'Pick one or more numeric columns',
    [isScatter, isPie],
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { height: '80vh' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ flex: 1 }}>
          <TextField
            size="small"
            value={config.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="Chart title"
            variant="standard"
            fullWidth
          />
        </Box>
        <Tooltip title="Export PNG">
          <IconButton onClick={exportPng} size="small"><FileDownloadIcon /></IconButton>
        </Tooltip>
        <Tooltip title="Copy ECharts option as JSON">
          <IconButton onClick={copyConfig} size="small"><ContentCopyIcon /></IconButton>
        </Tooltip>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', p: 0, overflow: 'hidden' }}>
        <Box sx={{ width: 280, p: 2, borderRight: 1, borderColor: 'divider', overflow: 'auto' }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">Chart type</Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={config.type}
                onChange={(_, v) => v && update('type', v as ChartType)}
                sx={{ flexWrap: 'wrap', mt: 0.5 }}
              >
                {CHART_TYPES.map((t) => (
                  <ToggleButton key={t.value} value={t.value} sx={{ textTransform: 'none' }}>
                    {t.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
            <FormControl size="small" fullWidth>
              <InputLabel>{isScatter ? 'Group by (optional)' : 'Category'}</InputLabel>
              <Select
                label={isScatter ? 'Group by (optional)' : 'Category'}
                value={config.categoryCol}
                onChange={(e) => update('categoryCol', String(e.target.value))}
              >
                {leafCols.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{headerLabel(c.id)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>{isPie ? 'Value' : 'Series'}</InputLabel>
              <Select
                multiple={!isPie}
                label={isPie ? 'Value' : 'Series'}
                value={isPie ? config.seriesCols[0] ?? '' : config.seriesCols}
                onChange={(e) => {
                  const v = e.target.value;
                  if (isPie) update('seriesCols', [String(v)]);
                  else update('seriesCols', (Array.isArray(v) ? v : [v]).map(String));
                }}
                renderValue={(v) => {
                  if (isPie) return headerLabel(String(v));
                  const arr = v as string[];
                  return arr.length === 0 ? seriesPlaceholder : arr.map(headerLabel).join(', ');
                }}
              >
                {numericLikeCols.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {!isPie && (
                      <Checkbox checked={config.seriesCols.includes(c.id)} size="small" sx={{ p: 0.5, mr: 1 }} />
                    )}
                    <ListItemText>{headerLabel(c.id)}</ListItemText>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {!isPie && !isScatter && (
              <FormControl size="small" fullWidth>
                <InputLabel>Split by (optional)</InputLabel>
                <Select
                  label="Split by (optional)"
                  value={config.splitByCol ?? ''}
                  onChange={(e) =>
                    update('splitByCol', e.target.value ? String(e.target.value) : undefined)
                  }
                >
                  <MenuItem value=""><em>None</em></MenuItem>
                  {leafCols.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{headerLabel(c.id)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <FormControl size="small" fullWidth>
              <InputLabel>Aggregation</InputLabel>
              <Select
                label="Aggregation"
                value={config.aggregation}
                onChange={(e) => update('aggregation', e.target.value as AggregationFn)}
              >
                {AGG_FNS.map((f) => (
                  <MenuItem key={f} value={f}>{f}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Divider />
            <FormControlLabel
              control={
                <Checkbox
                  checked={config.legend !== false}
                  onChange={(e) => update('legend', e.target.checked)}
                />
              }
              label="Show legend"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={config.downsample !== false}
                  onChange={(e) => update('downsample', e.target.checked)}
                />
              }
              label={`Downsample (max ${config.maxPoints ?? 500})`}
            />
          </Stack>
        </Box>
        <Box sx={{ flex: 1, position: 'relative' }}>
          {!loaded && (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography color="text.secondary">Loading ECharts…</Typography>
            </Box>
          )}
          <Box ref={containerRef} sx={{ width: '100%', height: '100%' }} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto', ml: 2 }}>
          Chart respects the current grid filters, sort, grouping and pagination.
        </Typography>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
