import { createContext, useContext, type ReactNode } from 'react';
import type { DataGridSlots } from '../types';
import type { UseDataGridResult } from '../hooks/useDataGrid';

export interface DataGridContextValue<T> extends UseDataGridResult<T> {
  slots?: DataGridSlots;
  emptyText: ReactNode;
  loading?: boolean;
  error?: ReactNode;
}

const DataGridContext = createContext<DataGridContextValue<unknown> | null>(null);

export function useDataGridContext<T = unknown>(): DataGridContextValue<T> {
  const ctx = useContext(DataGridContext);
  if (!ctx) throw new Error('DataGrid.* components must be rendered inside <DataGrid.Root>');
  return ctx as DataGridContextValue<T>;
}

export { DataGridContext };
