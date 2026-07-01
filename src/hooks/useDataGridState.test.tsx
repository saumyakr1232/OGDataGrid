import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDataGridState } from './useDataGridState';
import type {
  DataGridColumnDef,
  DataGridProps,
  DataGridState,
} from '../types';

type Person = { id: string; name: string; age: number; city: string };

const data: Person[] = [
  { id: '1', name: 'Alice', age: 30, city: 'NYC' },
  { id: '2', name: 'Bob', age: 25, city: 'LA' },
  { id: '3', name: 'Carol', age: 40, city: '' },
  { id: '4', name: 'Dave', age: 20, city: 'SF' },
];

const columns: DataGridColumnDef<Person>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'age', header: 'Age' },
  { accessorKey: 'city', header: 'City' },
];

function setup(overrides: Partial<DataGridProps<Person>> = {}) {
  return renderHook(() =>
    useDataGridState<Person>({
      rows: data,
      columns,
      getRowId: (r) => r.id,
      ...overrides,
    }),
  );
}

function visibleNames(result: { current: ReturnType<typeof useDataGridState<Person>> }) {
  return result.current.table.getRowModel().rows.map((r) => r.original.name);
}

describe('useDataGridState — initialization', () => {
  it('falls back to defaults when nothing is provided', () => {
    const { result } = setup();
    expect(result.current.state.density).toBe('standard');
    expect(result.current.state.pagination.pageSize).toBe(25);
    expect(result.current.state.globalFilter).toBe('');
  });

  it('merges initialState over defaults', () => {
    const { result } = setup({ initialState: { density: 'comfortable', showFilters: true } });
    expect(result.current.state.density).toBe('comfortable');
    expect(result.current.state.showFilters).toBe(true);
  });

  it('lets controlled state win over initialState', () => {
    const { result } = setup({
      initialState: { density: 'comfortable' },
      state: { density: 'compact' },
    });
    expect(result.current.state.density).toBe('compact');
  });
});

describe('useDataGridState — setters and onStateChange', () => {
  it('updates state through setters', () => {
    const { result } = setup();
    act(() => result.current.setters.setDensity('compact'));
    expect(result.current.state.density).toBe('compact');

    act(() => result.current.setters.setShowFilters(true));
    expect(result.current.state.showFilters).toBe(true);

    act(() => result.current.setters.setGlobalFilter('bob'));
    expect(result.current.state.globalFilter).toBe('bob');
  });

  it('emits onStateChange when state changes', () => {
    const onStateChange = vi.fn();
    const { result } = setup({ onStateChange });
    const callsAfterMount = onStateChange.mock.calls.length;

    act(() => result.current.setters.setDensity('compact'));

    expect(onStateChange.mock.calls.length).toBeGreaterThan(callsAfterMount);
    const last = onStateChange.mock.calls.at(-1)![0];
    expect(last.density).toBe('compact');
  });
});

describe('useDataGridState — global filter', () => {
  it('filters rows by a case-insensitive substring match across cells', () => {
    const { result } = setup();
    act(() => result.current.setters.setGlobalFilter('la'));
    expect(visibleNames(result)).toEqual(['Bob']);
  });

  it('does not search hidden columns', () => {
    const visible = setup();
    act(() => visible.result.current.setters.setGlobalFilter('NYC'));
    expect(visibleNames(visible.result)).toEqual(['Alice']);

    const hidden = setup({ initialState: { columnVisibility: { city: false } } });
    act(() => hidden.result.current.setters.setGlobalFilter('NYC'));
    expect(visibleNames(hidden.result)).toEqual([]);
  });
});

describe('useDataGridState — controlled state', () => {
  it('applies state updates passed after mount', () => {
    type StateProps = { state?: Partial<DataGridState> };
    const { result, rerender } = renderHook(
      ({ state }: StateProps) =>
        useDataGridState<Person>({ rows: data, columns, getRowId: (r) => r.id, state }),
      { initialProps: {} as StateProps },
    );

    expect(result.current.state.density).toBe('standard');

    rerender({ state: { density: 'compact' } });
    expect(result.current.state.density).toBe('compact');
  });
});

describe('useDataGridState — auto-wired column filterFns', () => {
  // `select` stores a scalar and must match by equality; `multiSelect` stores an
  // array and matches by membership. Wiring the array fn to single select throws
  // (filterValue.some on a string), so these guard that the variants map apart.
  function setupWith(meta: { filterVariant: 'select' | 'multiSelect' }) {
    const cols: DataGridColumnDef<Person>[] = [
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'city', header: 'City', meta },
    ];
    return renderHook(() =>
      useDataGridState<Person>({ rows: data, columns: cols, getRowId: (r) => r.id }),
    );
  }

  it('single select filters by exact equality on a scalar value', () => {
    const { result } = setupWith({ filterVariant: 'select' });
    act(() => result.current.table.getColumn('city')!.setFilterValue('NYC'));
    expect(visibleNames(result)).toEqual(['Alice']);
  });

  it('multiSelect filters by membership on an array value', () => {
    const { result } = setupWith({ filterVariant: 'multiSelect' });
    act(() => result.current.table.getColumn('city')!.setFilterValue(['NYC', 'SF']));
    expect(visibleNames(result)).toEqual(['Alice', 'Dave']);
  });
});
