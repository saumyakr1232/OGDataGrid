import { createContext, useContext, type ReactNode } from 'react';
import type { CellClickParams, DataGridSlots } from '../types';
import type { UseDataGridResult } from '../hooks/useDataGrid';

export interface DataGridContextValue<T> extends UseDataGridResult<T> {
  slots?: DataGridSlots;
  emptyText: ReactNode;
  loading?: boolean;
  error?: ReactNode;
  onCellClick?: (params: CellClickParams<T>) => void;
  /** Fixed body row height in px; overrides the density-derived height. */
  rowHeight?: number;
  /** Arbitrary consumer data, shared with custom parts via useDataGridMeta. */
  meta?: unknown;
}

const DataGridContext = createContext<DataGridContextValue<unknown> | null>(null);

export function useDataGridContext<T = unknown>(): DataGridContextValue<T> {
  const ctx = useContext(DataGridContext);
  if (!ctx) throw new Error('DataGrid.* components must be rendered inside <DataGrid.Provider>');
  return ctx as DataGridContextValue<T>;
}

// Lets a subtree (e.g. an overflow dropdown) override the toolbar's icon-only
// mode; undefined means inherit.
const IconOnlyOverrideContext = createContext<boolean | undefined>(undefined);

/** Icon-only resolution: explicit prop, then subtree override, then toolbar config. */
export function useToolbarIconOnly(explicit?: boolean): boolean {
  const override = useContext(IconOnlyOverrideContext);
  const ctx = useContext(DataGridContext);
  return explicit ?? override ?? ctx?.iconOnly ?? false;
}

export { IconOnlyOverrideContext };

export function useDataGridMeta<TMeta = unknown>(): TMeta | undefined {
  return useDataGridContext().meta as TMeta | undefined;
}

export { DataGridContext };
