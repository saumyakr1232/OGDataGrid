import { useState } from 'react';
import { Toolbar } from '../components/Toolbar';
import { AdvancedFilterPanel } from '../components/AdvancedFilterPanel';
import { exportTableToCsv } from '../export/toCsv';
import { useDataGridContext } from './context';

export function DataGridToolbar() {
  const { table, state, setters, tools, slots, csvFileName } = useDataGridContext();
  const [advOpen, setAdvOpen] = useState(false);

  return (
    <>
      <Toolbar
        table={table}
        showFilters={state.showFilters}
        onToggleFilters={() => setters.setShowFilters(!state.showFilters)}
        globalFilter={state.globalFilter}
        onGlobalFilterChange={setters.setGlobalFilter}
        onOpenAdvanced={() => setAdvOpen(true)}
        advancedFilter={state.advancedFilter}
        density={state.density}
        onDensityChange={setters.setDensity}
        tools={tools}
        onExportCsv={() => exportTableToCsv(table, csvFileName)}
        extras={slots?.toolbarExtras}
      />
      <AdvancedFilterPanel
        open={advOpen}
        onClose={() => setAdvOpen(false)}
        table={table}
        value={state.advancedFilter}
        onChange={setters.setAdvancedFilter}
      />
    </>
  );
}
