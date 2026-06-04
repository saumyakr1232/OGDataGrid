import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { DataGrid } from '../DataGrid';
import type { CellClickParams, DataGridColumnDef } from '../types';

type Person = { id: string; name: string; age: number };

const data: Person[] = [
  { id: '1', name: 'Alice', age: 30 },
  { id: '2', name: 'Bob', age: 25 },
];

const columns: DataGridColumnDef<Person>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'age', header: 'Age' },
];

function renderGrid(onCellClick: (p: CellClickParams<Person>) => void, selection?: boolean) {
  return render(
    <DataGrid.Provider<Person>
      rows={data}
      columns={columns}
      getRowId={(r) => r.id}
      onCellClick={onCellClick}
      pagination={false}
      enableVirtualization={false}
      selection={selection ? { mode: 'multi' } : undefined}
    >
      <DataGrid.Container>
        <DataGrid.Table<Person> />
      </DataGrid.Container>
    </DataGrid.Provider>,
  );
}

describe('onCellClick', () => {
  it('fires for a data cell with the right params', () => {
    const onCellClick = vi.fn();
    const { container } = renderGrid(onCellClick);
    const cell = [...container.querySelectorAll('tbody td')].find((td) => td.textContent === 'Alice')!;
    fireEvent.click(cell);

    expect(onCellClick).toHaveBeenCalledTimes(1);
    const arg = onCellClick.mock.calls[0][0] as CellClickParams<Person>;
    expect(arg.columnId).toBe('name');
    expect(arg.value).toBe('Alice');
    expect(arg.rowId).toBe('1');
    expect(arg.row.name).toBe('Alice');
  });

  it('does not fire for the selection column', () => {
    const onCellClick = vi.fn();
    const { container } = renderGrid(onCellClick, true);
    const selectionCell = container.querySelector('tbody tr td')!;
    fireEvent.click(selectionCell);
    expect(onCellClick).not.toHaveBeenCalled();
  });
});

describe('rowHeight', () => {
  it('applies the fixed height to body cells', () => {
    const { container } = render(
      <DataGrid.Provider<Person>
        rows={data}
        columns={columns}
        getRowId={(r) => r.id}
        pagination={false}
        enableVirtualization={false}
        rowHeight={72}
      >
        <DataGrid.Container>
          <DataGrid.Table<Person> />
        </DataGrid.Container>
      </DataGrid.Provider>,
    );
    const cell = container.querySelector('tbody td') as HTMLElement;
    expect(cell.style.height).toBe('72px');
  });
});

describe('prop pass-through', () => {
  it('forwards props to the QuickFilter input and the export button', () => {
    const { container, getByLabelText } = render(
      <DataGrid.Provider<Person> rows={data} columns={columns} getRowId={(r) => r.id} pagination={false} enableVirtualization={false}>
        <DataGrid.Container>
          <DataGrid.Toolbar>
            <DataGrid.QuickFilter placeholder="Find people" inputProps={{ 'aria-label': 'qf' }} />
            <DataGrid.ExportButton disabled />
          </DataGrid.Toolbar>
          <DataGrid.Table<Person> />
        </DataGrid.Container>
      </DataGrid.Provider>,
    );
    expect(getByLabelText('qf')).toBeTruthy();
    expect(container.querySelector('input[placeholder="Find people"]')).toBeTruthy();
    const exportBtn = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Export CSV')!;
    expect(exportBtn).toHaveProperty('disabled', true);
  });
});
