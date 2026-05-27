import { Tooltip } from '@mui/material';
import { useMemo } from 'react';
import type { SparklineConfig } from '../types';

const DEFAULT_W = 120;
const DEFAULT_H = 28;

export function Sparkline<T>({
  values,
  config,
}: {
  values: number[];
  config: SparklineConfig<T>;
}) {
  const w = config.width ?? DEFAULT_W;
  const h = config.height ?? DEFAULT_H;
  const type = config.type;

  const { paths, dots, info } = useMemo(() => {
    const v = values.filter((x) => typeof x === 'number' && !Number.isNaN(x));
    if (v.length === 0) return { paths: [], dots: [], info: null };
    const min = Math.min(...v);
    const max = Math.max(...v);
    const span = max - min || 1;
    const n = v.length;
    const xStep = n > 1 ? (w - 2) / (n - 1) : 0;
    const yFor = (val: number) => h - 2 - ((val - min) / span) * (h - 4);

    let mainPath = '';
    const positiveBars: { x: number; y: number; w: number; h: number }[] = [];
    const negativeBars: { x: number; y: number; w: number; h: number }[] = [];
    if (type === 'line' || type === 'area') {
      mainPath = v
        .map((val, i) => `${i === 0 ? 'M' : 'L'} ${1 + i * xStep} ${yFor(val)}`)
        .join(' ');
    } else if (type === 'bar' || type === 'winLoss') {
      const barW = Math.max(1, xStep * 0.7);
      const zeroY = type === 'winLoss' ? h / 2 : h - 2;
      v.forEach((val, i) => {
        const x = 1 + i * xStep - barW / 2;
        if (type === 'winLoss') {
          const half = (h - 4) / 2;
          if (val >= 0) {
            positiveBars.push({ x, y: zeroY - half * 0.9, w: barW, h: half * 0.9 });
          } else {
            negativeBars.push({ x, y: zeroY, w: barW, h: half * 0.9 });
          }
        } else {
          const y = yFor(val);
          positiveBars.push({ x, y, w: barW, h: zeroY - y });
        }
      });
    }

    const first = v[0];
    const last = v[v.length - 1];
    const trend = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
    return {
      paths: [mainPath],
      dots: [
        { x: 1, y: yFor(first), value: first, kind: 'first' as const },
        { x: 1 + (n - 1) * xStep, y: yFor(last), value: last, kind: 'last' as const },
      ],
      info: { min, max, first, last, trend, positiveBars, negativeBars, mainPath, areaPath: mainPath ? `${mainPath} L ${1 + (n - 1) * xStep} ${h - 2} L 1 ${h - 2} Z` : '' },
    };
  }, [values, w, h, type]);

  if (!info) {
    return <span style={{ color: 'rgba(0,0,0,0.3)' }}>—</span>;
  }

  const color =
    typeof config.color === 'function'
      ? config.color(values)
      : config.color ?? '#1976d2';
  const posColor = config.thresholds?.positive ?? '#2e7d32';
  const negColor = config.thresholds?.negative ?? '#c62828';

  let svg: React.ReactNode = null;
  if (type === 'line') {
    svg = (
      <>
        <path d={info.mainPath} fill="none" stroke={color} strokeWidth={1.5} />
        {dots.map((d) => (
          <circle key={d.kind} cx={d.x} cy={d.y} r={1.6} fill={color} />
        ))}
      </>
    );
  } else if (type === 'area') {
    svg = (
      <>
        <path d={info.areaPath} fill={color} fillOpacity={0.18} stroke="none" />
        <path d={info.mainPath} fill="none" stroke={color} strokeWidth={1.5} />
      </>
    );
  } else if (type === 'bar') {
    svg = (
      <>
        {info.positiveBars.map((b, i) => (
          <rect key={i} x={b.x} y={b.y} width={b.w} height={Math.max(1, b.h)} fill={color} />
        ))}
      </>
    );
  } else if (type === 'winLoss') {
    svg = (
      <>
        {info.positiveBars.map((b, i) => (
          <rect key={`p${i}`} x={b.x} y={b.y} width={b.w} height={Math.max(1, b.h)} fill={posColor} />
        ))}
        {info.negativeBars.map((b, i) => (
          <rect key={`n${i}`} x={b.x} y={b.y} width={b.w} height={Math.max(1, b.h)} fill={negColor} />
        ))}
      </>
    );
  }

  const sparkline = (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ display: 'block', overflow: 'visible' }}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Sparkline ${type}`}
    >
      {paths.length > 0 ? svg : null}
      {(type === 'line' || type === 'area') &&
        dots.map((d) => <circle key={d.kind} cx={d.x} cy={d.y} r={1.8} fill={color} />)}
    </svg>
  );

  if (config.showTooltip === false) return sparkline;

  return (
    <Tooltip
      arrow
      title={
        <div style={{ fontSize: 11, lineHeight: 1.4 }}>
          <div>First: {fmt(info.first)}</div>
          <div>Last: {fmt(info.last)}</div>
          <div>Min: {fmt(info.min)}</div>
          <div>Max: {fmt(info.max)}</div>
          <div>Trend: {info.trend >= 0 ? '+' : ''}{fmt(info.trend)}%</div>
        </div>
      }
    >
      <span style={{ display: 'inline-block' }}>{sparkline}</span>
    </Tooltip>
  );
}

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
