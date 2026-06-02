import type { ReactNode } from 'react';
import { useDataGrid } from '../hooks/useDataGrid';
import { GridRoot } from '../styled';
import { DataGridContext, type DataGridContextValue } from './context';
import type { DataGridProps } from '../types';

export type DataGridRootProps<T> = DataGridProps<T> & { children: ReactNode };

export function DataGridRoot<T>({ children, ...props }: DataGridRootProps<T>) {
  const core = useDataGrid<T>(props);

  const value: DataGridContextValue<T> = {
    ...core,
    slots: props.slots,
    emptyText: props.emptyText ?? 'N/A',
    loading: props.loading,
    error: props.error,
  };

  return (
    <DataGridContext.Provider value={value as DataGridContextValue<unknown>}>
      <GridRoot className={props.className} sx={{ height: props.height ?? 560 }}>
        {children}
      </GridRoot>
    </DataGridContext.Provider>
  );
}
