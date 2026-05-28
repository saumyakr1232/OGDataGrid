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
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Row, Table } from '@tanstack/react-table';
import type { AggregationFn } from '../types';
import type { CellRange } from '../hooks/useCellInteraction';
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
  /** The selected cell range at the moment this dialog opened, if any. When
   *  provided the chart starts in "linked" mode: it restricts data to the
   *  range and follows further selection changes via `getLiveRange`. */
  linkedRange,
  /** Returns the *current* selection range so the chart can follow it while
   *  linked. Called on every gridStateVersion change. */
  getLiveRange,
}: {
  open: boolean;
  onClose: () => void;
  table: Table<T>;
  initialConfig?: Partial<ChartConfig>;
  gridStateVersion: number;
  linkedRange?: CellRange | null;
  getLiveRange?: () => CellRange | null;
}) {
  const leafCols = table.getAllLeafColumns().filter((c) => !c.id.startsWith('__'));
  const isNumericLike = (v: unknown) => {
    if (v instanceof Date) return false;
    if (typeof v === 'number') return !Number.isNaN(v);
    if (v == null || v === '' || typeof v === 'boolean') return false;
    return !Number.isNaN(Number(v));
  };
  const numericLikeCols = leafCols.filter((c) => {
    const sample = table.getRowModel().rows[0];
    if (!sample) return true;
    return isNumericLike(sample.getValue(c.id));
  });
  // A good default X-axis is a categorical (non-numeric) column; fall back to
  // the first column if every column looks numeric.
  const firstCategoricalCol =
    leafCols.find((c) => !numericLikeCols.includes(c)) ?? leafCols[0];

  // A 1×1 selection (a single active cell) isn't a meaningful range to chart —
  // treat it as "no range" so we don't force both axes onto one column.
  const isMeaningfulRange = (r: CellRange | null | undefined): r is CellRange =>
    !!r && (r.endRow > r.startRow || r.endCol > r.startCol);

  const [config, setConfig] = useState<ChartConfig>(() => ({
    type: initialConfig?.type ?? 'bar',
    title: initialConfig?.title ?? '',
    categoryCol: initialConfig?.categoryCol ?? firstCategoricalCol?.id ?? leafCols[0]?.id ?? '',
    seriesCols: initialConfig?.seriesCols ?? (numericLikeCols[0] ? [numericLikeCols[0].id] : []),
    splitByCol: initialConfig?.splitByCol,
    aggregation: initialConfig?.aggregation ?? 'sum',
    xName: initialConfig?.xName,
    yName: initialConfig?.yName,
    legend: initialConfig?.legend ?? true,
    downsample: initialConfig?.downsample ?? true,
    maxPoints: initialConfig?.maxPoints ?? 500,
  }));

  // Linked = chart follows the live selection range. User can Detach to freeze.
  const [linked, setLinked] = useState<boolean>(isMeaningfulRange(linkedRange));
  const [snapshotRange, setSnapshotRange] = useState<CellRange | null>(
    isMeaningfulRange(linkedRange) ? linkedRange : null,
  );

  // Snapshot of the live range, refreshed every render. Serializing it gives the
  // memo below a dependency that actually changes when the selection moves
  // (gridStateVersion only tracks sort/filter/group, not the cell range).
  const liveRange = linked ? getLiveRange?.() ?? null : null;
  const liveRangeKey = liveRange
    ? `${liveRange.startRow},${liveRange.endRow},${liveRange.startCol},${liveRange.endCol}`
    : '';

  const effectiveRange: CellRange | null = useMemo(() => {
    if (!linked) return isMeaningfulRange(snapshotRange) ? snapshotRange : null;
    if (isMeaningfulRange(liveRange)) return liveRange;
    return isMeaningfulRange(linkedRange) ? linkedRange : null;
    // liveRangeKey stands in for liveRange; gridStateVersion keeps row-model reads fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linked, liveRangeKey, gridStateVersion, snapshotRange, linkedRange]);

  // Restrict rows to the effective range (if any). Read against the table's
  // current row model so sort/filter/grouping still applies.
  const rangeRows = useMemo<Row<T>[] | undefined>(() => {
    if (!effectiveRange) return undefined;
    const all = table.getRowModel().rows;
    return all.slice(effectiveRange.startRow, effectiveRange.endRow + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveRange, gridStateVersion, table]);

  // Restrict the set of columns the user can pick (when ranged) to those in
  // the range. We don't FORCE the picker to those — but we filter the option
  // list so picking outside-the-range cols isn't possible while linked.
  const rangeColIds = useMemo<string[] | null>(() => {
    if (!effectiveRange) return null;
    const vis = table.getVisibleLeafColumns();
    return vis
      .slice(effectiveRange.startCol, effectiveRange.endCol + 1)
      .map((c) => c.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveRange, gridStateVersion, table]);

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

  // Render / update on config, grid state, or range change.
  useEffect(() => {
    if (!loaded || !chartRef.current) return;
    const option = buildEChartsOption(table, config, rangeRows) as unknown as Parameters<import('echarts').ECharts['setOption']>[0];
    chartRef.current.setOption(option, true);
  }, [loaded, table, config, gridStateVersion, rangeRows]);

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
    const opt = buildEChartsOption(table, config, rangeRows);
    try {
      await navigator.clipboard.writeText(JSON.stringify(opt, null, 2));
    } catch {
      /* ignore */
    }
  };

  const detach = () => {
    setSnapshotRange(effectiveRange);
    setLinked(false);
  };

  // When a range is supplied (now or later) and we're linked, auto-pre-fill the
  // picker with sensible defaults:
  //   - category = first column in the range (typically the row label)
  //   - series   = remaining numeric-looking columns in the range
  // The user can still override.
  useEffect(() => {
    if (!linked || !rangeColIds || rangeColIds.length === 0) return;
    const [first, ...rest] = rangeColIds;
    setConfig((c) => {
      const restNumeric = rest.filter((id) => {
        const sample = table.getRowModel().rows[0];
        if (!sample) return true;
        return isNumericLike(sample.getValue(id));
      });
      // If the user already configured columns outside the range, snap them
      // back into the range.
      const inRange = (id: string) => rangeColIds.includes(id);
      const nextCategory = inRange(c.categoryCol) ? c.categoryCol : first;
      const nextSeries = c.seriesCols.filter(inRange);
      // Prefer numeric columns for the Y-axis. If the range has none, keep the
      // user's current selection (or the numeric default) rather than forcing a
      // non-numeric column, which would render an empty chart.
      const seriesSeed =
        nextSeries.length > 0
          ? nextSeries
          : restNumeric.length > 0
            ? restNumeric
            : c.seriesCols.length > 0
              ? c.seriesCols
              : numericLikeCols[0]
                ? [numericLikeCols[0].id]
                : [first];
      return { ...c, categoryCol: nextCategory, seriesCols: seriesSeed };
    });
    // intentionally re-run when the range membership changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linked, rangeColIds?.join('|')]);

  const update = <K extends keyof ChartConfig>(k: K, v: ChartConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const isPie = config.type === 'pie' || config.type === 'doughnut';
  const isScatter = config.type === 'scatter';
  const headerLabel = (id: string) =>
    String(table.getColumn(id)?.columnDef.header ?? id);

  // Generic, axis-oriented control labels.
  const categoryLabel = isScatter ? 'Group by (optional)' : isPie ? 'Category' : 'X-axis';
  const seriesLabel = isPie ? 'Value' : isScatter ? 'X then Y columns' : 'Y-axis';

  // Default axis-name placeholders mirror what buildOption renders when the
  // user leaves the axis-name fields blank.
  const xAxisPlaceholder = isScatter
    ? config.seriesCols[0]
      ? headerLabel(config.seriesCols[0])
      : 'X'
    : headerLabel(config.categoryCol);
  const yAxisPlaceholder = isScatter
    ? config.seriesCols[1] ?? config.seriesCols[0]
      ? headerLabel(config.seriesCols[1] ?? config.seriesCols[0])
      : 'Y'
    : config.seriesCols.length === 1
      ? `${config.aggregation} of ${headerLabel(config.seriesCols[0])}`
      : 'Value';

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
        {(isMeaningfulRange(linkedRange) || snapshotRange) && (
          <Tooltip
            title={
              linked
                ? 'Linked to the live selection range. Click to freeze a snapshot.'
                : 'Detached — chart no longer follows the grid selection.'
            }
          >
            <IconButton onClick={linked ? detach : () => setLinked(true)} size="small" color={linked ? 'primary' : 'default'}>
              {linked ? <LinkIcon /> : <LinkOffIcon />}
            </IconButton>
          </Tooltip>
        )}
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
              <InputLabel>{categoryLabel}</InputLabel>
              <Select
                label={categoryLabel}
                value={config.categoryCol}
                onChange={(e) => update('categoryCol', String(e.target.value))}
              >
                {(linked && rangeColIds
                  ? leafCols.filter((c) => rangeColIds.includes(c.id))
                  : leafCols
                ).map((c) => (
                  <MenuItem key={c.id} value={c.id}>{headerLabel(c.id)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>{seriesLabel}</InputLabel>
              <Select
                multiple={!isPie}
                label={seriesLabel}
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
                {(linked && rangeColIds
                  ? numericLikeCols.filter((c) => rangeColIds.includes(c.id))
                  : numericLikeCols
                ).map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {!isPie && (
                      <Checkbox checked={config.seriesCols.includes(c.id)} size="small" sx={{ p: 0.5, mr: 1 }} />
                    )}
                    <ListItemText>{headerLabel(c.id)}</ListItemText>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {!isPie && (
              <>
                <TextField
                  size="small"
                  fullWidth
                  label="X-axis name"
                  value={config.xName ?? ''}
                  placeholder={xAxisPlaceholder}
                  onChange={(e) => update('xName', e.target.value || undefined)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  size="small"
                  fullWidth
                  label="Y-axis name"
                  value={config.yName ?? ''}
                  placeholder={yAxisPlaceholder}
                  onChange={(e) => update('yName', e.target.value || undefined)}
                  InputLabelProps={{ shrink: true }}
                />
              </>
            )}
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
          {effectiveRange && linked
            ? `Linked to a ${effectiveRange.endRow - effectiveRange.startRow + 1} × ${effectiveRange.endCol - effectiveRange.startCol + 1} range — chart follows the selection until you detach.`
            : effectiveRange
              ? 'Detached snapshot — chart no longer follows the grid selection.'
              : 'Chart respects the current grid filters, sort, grouping and pagination.'}
        </Typography>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
