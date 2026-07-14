import { useState } from 'react';
import { Box, Container, Stack, Tab, Tabs, Typography } from '@mui/material';
import { ShowcaseTab } from './tabs/ShowcaseTab';
import { ConfigTab } from './tabs/ConfigTab';
import { ColumnsTab } from './tabs/ColumnsTab';
import { SelectionTab } from './tabs/SelectionTab';
import { VirtualizationTab } from './tabs/VirtualizationTab';
import { ToolbarTab } from './tabs/ToolbarTab';
import { StatesTab } from './tabs/StatesTab';

const TABS = [
  { label: 'Showcase', blurb: 'The full grid, built two ways — flip Composition / Normal.' },
  { label: 'JSON config', blurb: 'Minimal → full configuration through JSON, with the config and data shown as code.' },
  { label: 'Columns', blurb: 'JSON config vs programmatic defs vs auto-generated columns.' },
  { label: 'Selection & state', blurb: 'Selection modes, cell clicks, controlled state, onStateChange.' },
  { label: 'Virtualization & sizing', blurb: '50k rows without pagination; height, density, rowHeight.' },
  { label: 'Toolbar', blurb: 'Default, icon-only, trimmed, none, responsive, overflow menu.' },
  { label: 'States', blurb: 'Loading, empty, error overlays and empty-cell text.' },
] as const;

export default function App() {
  const [tab, setTab] = useState(0);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h4">OGDataGrid Demo</Typography>
          <Typography variant="body2" color="text.secondary">
            Every grid variation — one tab at a time. {TABS[tab].blurb}
          </Typography>
        </Box>

        <Tabs
          value={tab}
          onChange={(_, v: number) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {TABS.map((t) => (
            <Tab key={t.label} label={t.label} />
          ))}
        </Tabs>

        {/* Only the active tab mounts — keeps the 50k-row grids off the page until needed. */}
        {tab === 0 && <ShowcaseTab />}
        {tab === 1 && <ConfigTab />}
        {tab === 2 && <ColumnsTab />}
        {tab === 3 && <SelectionTab />}
        {tab === 4 && <VirtualizationTab />}
        {tab === 5 && <ToolbarTab />}
        {tab === 6 && <StatesTab />}
      </Stack>
    </Container>
  );
}
