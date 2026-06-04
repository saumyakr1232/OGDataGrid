import type { ReactNode } from 'react';
import { useDataGrid } from '../hooks/useDataGrid';
import { DataGridContext, type DataGridContextValue } from './context';
import type { DataGridProps } from '../types';

export type DataGridProviderProps<T> = DataGridProps<T> & {
  meta?: unknown;
  children: ReactNode;
};

export function DataGridProvider<T>({ children, meta, ...props }: DataGridProviderProps<T>) {
  const core = useDataGrid<T>(props);

  const value: DataGridContextValue<T> = {
    ...core,
    slots: props.slots,
    emptyText: props.emptyText ?? 'N/A',
    loading: props.loading,
    error: props.error,
    onCellClick: props.onCellClick,
    rowHeight: props.rowHeight,
    meta,
  };

  return (
    <DataGridContext.Provider value={value as DataGridContextValue<unknown>}>
      {children}
    </DataGridContext.Provider>
  );
}
