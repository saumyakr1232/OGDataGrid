import { createContext, useContext, type ReactNode } from 'react';
import type { CellClickParams, DataGridSlots } from '../types';
import type { UseDataGridResult } from '../hooks/useDataGrid';

export interface DataGridContextValue<T> extends UseDataGridResult<T> {
  slots?: DataGridSlots;
  emptyText: ReactNode;
  loading?: boolean;
  error?: ReactNode;
  onCellClick?: (params: CellClickParams<T>) => void;
  /** Arbitrary consumer data, shared with custom parts via useDataGridMeta. */
  meta?: unknown;
}

const DataGridContext = createContext<DataGridContextValue<unknown> | null>(null);

export function useDataGridContext<T = unknown>(): DataGridContextValue<T> {
  const ctx = useContext(DataGridContext);
  if (!ctx) throw new Error('DataGrid.* components must be rendered inside <DataGrid.Provider>');
  return ctx as DataGridContextValue<T>;
}

export function useDataGridMeta<TMeta = unknown>(): TMeta | undefined {
  return useDataGridContext().meta as TMeta | undefined;
}

export { DataGridContext };
