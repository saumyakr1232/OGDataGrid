import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDataGridState } from './useDataGridState';
import type {
  AdvancedFilterGroup,
  DataGridColumnDef,
  DataGridProps,
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

// The engine keys its filtered row model on the sentinel global-filter value,
// which is constant for any non-empty advanced filter. Switching between two
// non-empty filters on one table instance therefore won't recompute, so each
// assertion gets a fresh hook (the empty -> sentinel transition does fire).
function filteredNames(
  rules: AdvancedFilterGroup['rules'],
  combinator: 'AND' | 'OR' = 'AND',
) {
  const { result } = setup();
  act(() => result.current.setters.setAdvancedFilter({ id: 'g', combinator, rules }));
  return visibleNames(result);
}

describe('useDataGridState — initialization', () => {
  it('falls back to defaults when nothing is provided', () => {
    const { result } = setup();
    expect(result.current.state.density).toBe('standard');
    expect(result.current.state.pagination.pageSize).toBe(25);
    expect(result.current.state.globalFilter).toBe('');
    expect(result.current.state.advancedFilter).toBeNull();
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
});

describe('useDataGridState — advanced filter eval', () => {
  it('equals / notEquals', () => {
    expect(filteredNames([{ id: 'r', columnId: 'age', op: 'equals', value: 30 }])).toEqual(['Alice']);
    expect(filteredNames([{ id: 'r', columnId: 'age', op: 'notEquals', value: 30 }])).toEqual([
      'Bob',
      'Carol',
      'Dave',
    ]);
  });

  it('contains / startsWith / endsWith', () => {
    expect(filteredNames([{ id: 'r', columnId: 'name', op: 'contains', value: 'a' }])).toEqual([
      'Alice',
      'Carol',
      'Dave',
    ]);
    expect(filteredNames([{ id: 'r', columnId: 'name', op: 'startsWith', value: 'C' }])).toEqual(['Carol']);
    expect(filteredNames([{ id: 'r', columnId: 'name', op: 'endsWith', value: 'e' }])).toEqual([
      'Alice',
      'Dave',
    ]);
  });

  it('numeric comparators gt / lt / between', () => {
    expect(filteredNames([{ id: 'r', columnId: 'age', op: 'gt', value: 25 }])).toEqual(['Alice', 'Carol']);
    expect(filteredNames([{ id: 'r', columnId: 'age', op: 'lt', value: 25 }])).toEqual(['Dave']);
    expect(
      filteredNames([{ id: 'r', columnId: 'age', op: 'between', value: 20, value2: 30 }]),
    ).toEqual(['Alice', 'Bob', 'Dave']);
  });

  it('isEmpty / isNotEmpty', () => {
    expect(filteredNames([{ id: 'r', columnId: 'city', op: 'isEmpty' }])).toEqual(['Carol']);
    expect(filteredNames([{ id: 'r', columnId: 'city', op: 'isNotEmpty' }])).toEqual([
      'Alice',
      'Bob',
      'Dave',
    ]);
  });

  it('inList', () => {
    expect(
      filteredNames([{ id: 'r', columnId: 'city', op: 'inList', value: ['NYC', 'SF'] }]),
    ).toEqual(['Alice', 'Dave']);
  });

  it('combines rules with AND', () => {
    expect(
      filteredNames(
        [
          { id: 'r1', columnId: 'age', op: 'gt', value: 22 },
          { id: 'r2', columnId: 'name', op: 'contains', value: 'a' },
        ],
        'AND',
      ),
    ).toEqual(['Alice', 'Carol']);
  });

  it('combines rules with OR', () => {
    expect(
      filteredNames(
        [
          { id: 'r1', columnId: 'age', op: 'lt', value: 21 },
          { id: 'r2', columnId: 'city', op: 'equals', value: 'NYC' },
        ],
        'OR',
      ),
    ).toEqual(['Alice', 'Dave']);
  });

  it('evaluates nested groups', () => {
    const { result } = setup();
    const nested: AdvancedFilterGroup = {
      id: 'outer',
      combinator: 'AND',
      rules: [
        { id: 'r1', columnId: 'age', op: 'gte', value: 25 },
        {
          id: 'inner',
          combinator: 'OR',
          rules: [
            { id: 'r2', columnId: 'city', op: 'equals', value: 'NYC' },
            { id: 'r3', columnId: 'city', op: 'isEmpty' },
          ],
        },
      ],
    };
    act(() => result.current.setters.setAdvancedFilter(nested));
    expect(visibleNames(result)).toEqual(['Alice', 'Carol']);
  });

  it('clearing the advanced filter restores all rows', () => {
    const { result } = setup();
    act(() =>
      result.current.setters.setAdvancedFilter({
        id: 'g',
        combinator: 'AND',
        rules: [{ id: 'r', columnId: 'age', op: 'equals', value: 30 }],
      }),
    );
    expect(visibleNames(result)).toEqual(['Alice']);

    act(() => result.current.setters.setAdvancedFilter(null));
    expect(visibleNames(result)).toEqual(['Alice', 'Bob', 'Carol', 'Dave']);
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
