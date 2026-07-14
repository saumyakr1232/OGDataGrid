import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import { DataGridProvider } from './compound/Provider';
import type { DataGridColumnDef } from './types';

type Person = { id: string; name: string; age: number };

const data: Person[] = [
  { id: '1', name: 'Alice', age: 30 },
  { id: '2', name: 'Bob', age: 25 },
  { id: '3', name: 'Carol', age: 40 },
];

const columns: DataGridColumnDef<Person>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'age', header: 'Age' },
];

describe('<DataGrid /> all-in-one', () => {
  it('renders header, default toolbar, rows, and pagination', () => {
    const { container, getByText, getByPlaceholderText } = render(
      <DataGrid<Person>
        rows={data}
        columns={columns}
        getRowId={(r) => r.id}
        title="People"
        subtitle="Everyone we know"
      />,
    );

    expect(getByText('People')).toBeTruthy();
    expect(getByText('Everyone we know')).toBeTruthy();
    // default toolbar renders the quick filter
    expect(getByPlaceholderText('Quick search…')).toBeTruthy();
    // body rows render (default client pagination keeps virtualization off)
    const cells = [...container.querySelectorAll('tbody td')].map((td) => td.textContent);
    expect(cells).toContain('Alice');
    // pagination footer present
    expect(container.querySelector('.MuiTablePagination-root')).toBeTruthy();
  });

  it('toolbar={false} renders no toolbar controls', () => {
    const { container, queryByPlaceholderText } = render(
      <DataGrid<Person> rows={data} columns={columns} getRowId={(r) => r.id} toolbar={false} />,
    );
    // guards the `toolbar || {}` trap: false must not fall back to the full toolset
    expect(queryByPlaceholderText('Quick search…')).toBeNull();
    const exportBtn = [...container.querySelectorAll('button')].find(
      (b) => b.textContent === 'Export CSV',
    );
    expect(exportBtn).toBeUndefined();
  });

  it('renders no header when title and subtitle are absent', () => {
    const { container } = render(
      <DataGrid<Person> rows={data} columns={columns} getRowId={(r) => r.id} />,
    );
    expect(container.querySelector('h6')).toBeNull();
  });

  it('pagination={false} drops the footer and renders all rows', () => {
    const { container } = render(
      <DataGrid<Person>
        rows={data}
        columns={columns}
        getRowId={(r) => r.id}
        pagination={false}
        enableVirtualization={false}
      />,
    );
    expect(container.querySelector('.MuiTablePagination-root')).toBeNull();
    expect(container.querySelectorAll('tbody tr').length).toBe(data.length);
  });

  it('keeps the compound parts attached as statics', () => {
    expect(DataGrid.Provider).toBe(DataGridProvider);
    expect(typeof DataGrid.Table).toBe('function');
    expect(typeof DataGrid.Toolbar).toBe('function');
  });

  it('supports an inline selection prop whose onChange sets parent state', () => {
    // Regression: the selection-notify effect used to depend on the `selection`
    // object identity; an inline `selection={{...}}` plus an onChange that sets
    // parent state re-created the object every render → infinite update loop.
    function Harness() {
      const [ids, setIds] = useState<string[]>([]);
      return (
        <>
          <span data-testid="count">{ids.length}</span>
          <DataGrid<Person>
            rows={data}
            columns={columns}
            getRowId={(r) => r.id}
            selection={{ mode: 'multi', onChange: setIds }}
            toolbar={false}
          />
        </>
      );
    }
    const { container, getByTestId } = render(<Harness />);
    const firstRowCheckbox = container.querySelector('tbody input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(firstRowCheckbox);
    expect(getByTestId('count').textContent).toBe('1');
  });

  it('reset filters clears the column filters and the quick search', async () => {
    const { container, getByLabelText, getByPlaceholderText } = render(
      <DataGrid<Person>
        rows={data}
        columns={columns}
        getRowId={(r) => r.id}
        initialState={{ showFilters: true }}
      />,
    );

    const resetBtn = getByLabelText('Reset filters') as HTMLButtonElement;
    // nothing active yet
    expect(resetBtn.disabled).toBe(true);

    // type into a column filter and the quick search
    const nameFilter = getByLabelText('Filter name');
    fireEvent.change(nameFilter, { target: { value: 'Ali' } });
    const search = getByPlaceholderText('Quick search…');
    fireEvent.change(search, { target: { value: 'Bob' } });

    // the debounced commits land, enabling the button and filtering the rows
    await waitFor(() => expect(resetBtn.disabled).toBe(false));

    fireEvent.click(resetBtn);

    await waitFor(() => {
      // inputs re-sync from the cleared state
      expect((nameFilter as HTMLInputElement).value).toBe('');
      expect((search as HTMLInputElement).value).toBe('');
      expect(resetBtn.disabled).toBe(true);
    });
    // all rows are back
    expect(container.querySelectorAll('tbody tr').length).toBe(data.length);
  });

  it('toolbar={{ resetFilters: false }} hides the reset button', () => {
    const { queryByLabelText } = render(
      <DataGrid<Person>
        rows={data}
        columns={columns}
        getRowId={(r) => r.id}
        toolbar={{ resetFilters: false }}
      />,
    );
    expect(queryByLabelText('Reset filters')).toBeNull();
  });

  it('renders slots.toolbarExtras inside the default toolbar', () => {
    const { getByTestId } = render(
      <DataGrid<Person>
        rows={data}
        columns={columns}
        getRowId={(r) => r.id}
        slots={{ toolbarExtras: <span data-testid="extra">extra</span> }}
      />,
    );
    expect(getByTestId('extra')).toBeTruthy();
  });
});
