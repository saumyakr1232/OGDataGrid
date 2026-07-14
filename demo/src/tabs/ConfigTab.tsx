import { useMemo, useState } from 'react';
import {
  Box,
  Step,
  StepButton,
  Stepper,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { DataGrid, type DataGridConfig } from 'og-data-grid';
import { CodeBlock } from '../components/CodeBlock';
import {
  CONFIG_LEVELS,
  SAMPLE_ROWS,
  SAMPLE_ROWS_JSON,
  type SampleRow,
} from '../data/configLevels';

type Panel = 'config' | 'data' | 'usage';

const MINIMAL_CONFIG_NOTE = '// No columns config.\n// The grid infers columns, headers and\n// filter variants from the row data.';

/** Build the `<DataGrid />` usage snippet that matches the current level. */
function usageFor(hasConfig: boolean, showFilters: boolean): string {
  const importLine = hasConfig
    ? "import { DataGrid } from 'og-data-grid';\nimport { sales } from './sales.data';\nimport config from './sales.config.json';"
    : "import { DataGrid } from 'og-data-grid';\nimport { sales } from './sales.data';";
  const props = [
    'rows={sales}',
    hasConfig ? 'columns={config}' : null,
    'getRowId={(r) => r.id}',
    showFilters ? 'initialState={{ showFilters: true }}' : null,
  ].filter(Boolean);
  return `${importLine}\n\n<DataGrid\n  ${props.join('\n  ')}\n/>`;
}

/** Minimal → full JSON configuration, with the config and data shown as code. */
export function ConfigTab() {
  const [level, setLevel] = useState(0);
  const [panel, setPanel] = useState<Panel>('config');

  const current = CONFIG_LEVELS[level];
  const columns = useMemo<DataGridConfig | undefined>(
    () => (current.config ? (JSON.parse(current.config) as DataGridConfig) : undefined),
    [current.config],
  );

  const codeForPanel = () => {
    if (panel === 'data') {
      return { code: SAMPLE_ROWS_JSON, language: 'json' as const, title: 'sales.data.json' };
    }
    if (panel === 'usage') {
      return { code: usageFor(!!current.config, !!current.showFilters), language: 'text' as const, title: 'App.tsx' };
    }
    return current.config
      ? { code: current.config, language: 'json' as const, title: 'sales.config.json' }
      : { code: MINIMAL_CONFIG_NOTE, language: 'text' as const, title: 'sales.config.json' };
  };
  const code = codeForPanel();

  return (
    <Box>
      <Stepper nonLinear activeStep={level} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        {CONFIG_LEVELS.map((lvl, i) => (
          <Step key={lvl.label} completed={false}>
            <StepButton color="inherit" onClick={() => setLevel(i)}>
              {lvl.label}
            </StepButton>
          </Step>
        ))}
      </Stepper>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        {current.blurb}
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        <Box component="span" sx={{ fontWeight: 600 }}>
          New here:{' '}
        </Box>
        {current.whatsNew}
      </Typography>

      {/* Grid on the left, the code that produced it on the right. */}
      <Box
        sx={{
          display: 'grid',
          // minmax(0, …) on both: a plain `1fr` track has an `auto` minimum, so
          // the code panel's unwrapped <pre> would stretch the track to its
          // longest line and push the whole page into horizontal overflow.
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) minmax(0, 1fr)' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <DataGrid<SampleRow>
          key={level} // config changes the column set — remount for a clean state
          rows={SAMPLE_ROWS}
          columns={columns}
          getRowId={(r) => r.id}
          initialState={current.showFilters ? { showFilters: true } : undefined}
          pagination={false}
          height={430}
        />

        <Box>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={panel}
            onChange={(_, v: Panel | null) => v && setPanel(v)}
            aria-label="Code panel"
            sx={{ mb: 1 }}
          >
            <ToggleButton value="config">Config</ToggleButton>
            <ToggleButton value="data">Data</ToggleButton>
            <ToggleButton value="usage">Usage</ToggleButton>
          </ToggleButtonGroup>
          <CodeBlock code={code.code} language={code.language} title={code.title} maxHeight={382} />
        </Box>
      </Box>
    </Box>
  );
}
