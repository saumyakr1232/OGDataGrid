import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  getCoreRowModel,
  getExpandedRowModel,
  getGroupedRowModel,
  useReactTable,
  type Table,
  type TableOptions,
} from '@tanstack/react-table';
import { exportTableToCsv } from './toCsv';
import type { DataGridColumnDef } from '../types';

let captured = '';
const RealBlob = globalThis.Blob;

beforeEach(() => {
  captured = '';
  globalThis.Blob = class {
    constructor(parts: unknown[]) {
      captured = (parts as string[][]).flat().join('');
    }
  } as unknown as typeof Blob;
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
  globalThis.URL.revokeObjectURL = vi.fn();
  // jsdom logs "Not implemented: navigation" for a real anchor click
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

afterEach(() => {
  globalThis.Blob = RealBlob;
  vi.restoreAllMocks();
});

function buildTable<T>(options: Partial<TableOptions<T>> & Pick<TableOptions<T>, 'data' | 'columns'>) {
  const { result } = renderHook(() =>
    useReactTable<T>({
      getCoreRowModel: getCoreRowModel(),
      ...options,
    }),
  );
  return result.current as Table<T>;
}

type Person = { name: string; amount: number; group?: string };

describe('exportTableToCsv', () => {
  it('writes a header row from visible leaf columns', () => {
    const columns: DataGridColumnDef<Person>[] = [
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'amount', header: 'Amount' },
    ];
    const table = buildTable<Person>({ data: [{ name: 'Alice', amount: 100 }], columns });

    exportTableToCsv(table, 'out.csv');

    expect(captured.split('\n')[0]).toBe('Name,Amount');
  });

  it('escapes commas, newlines, and quotes per RFC 4180', () => {
    const columns: DataGridColumnDef<Person>[] = [{ accessorKey: 'name', header: 'Name' }];
    const table = buildTable<Person>({
      data: [
        { name: 'Bob, Jr', amount: 0 },
        { name: 'Line\nBreak', amount: 0 },
        { name: 'Quote"Me', amount: 0 },
        { name: 'Plain', amount: 0 },
      ],
      columns,
    });

    exportTableToCsv(table, 'out.csv');
    const lines = captured.split('\n');

    expect(lines[1]).toBe('"Bob, Jr"');
    // a value with a newline is wrapped, so it spans two physical lines
    expect(captured).toContain('"Line\nBreak"');
    expect(lines).toContain('"Quote""Me"');
    expect(lines).toContain('Plain');
  });

  it('renders empty cells for null/undefined values', () => {
    const columns: DataGridColumnDef<{ a: unknown }>[] = [{ accessorKey: 'a', header: 'A' }];
    const table = buildTable<{ a: unknown }>({
      data: [{ a: null }, { a: undefined }],
      columns,
    });

    exportTableToCsv(table, 'out.csv');
    const lines = captured.split('\n');

    expect(lines[1]).toBe('');
    expect(lines[2]).toBe('');
  });

  it('prefers meta.exportValue over the raw cell value', () => {
    const columns: DataGridColumnDef<Person>[] = [
      {
        accessorKey: 'amount',
        header: 'Amount',
        meta: { exportValue: (row) => `$${row.amount.toFixed(2)}` },
      },
    ];
    const table = buildTable<Person>({ data: [{ name: 'Alice', amount: 100 }], columns });

    exportTableToCsv(table, 'out.csv');

    expect(captured.split('\n')[1]).toBe('$100.00');
  });

  it('recurses into expanded grouped subrows', () => {
    const columns: DataGridColumnDef<Person>[] = [
      { accessorKey: 'group', header: 'Group' },
      { accessorKey: 'name', header: 'Name' },
    ];
    const table = buildTable<Person>({
      data: [
        { group: 'A', name: 'Alice', amount: 1 },
        { group: 'A', name: 'Anna', amount: 2 },
        { group: 'B', name: 'Bob', amount: 3 },
      ],
      columns,
      state: { grouping: ['group'], expanded: true },
      getGroupedRowModel: getGroupedRowModel(),
      getExpandedRowModel: getExpandedRowModel(),
    });

    exportTableToCsv(table, 'out.csv');

    // expanded subrows contribute their leaf names
    expect(captured).toContain('Alice');
    expect(captured).toContain('Anna');
    expect(captured).toContain('Bob');
  });

  it('appends a .csv extension when missing', () => {
    const columns: DataGridColumnDef<Person>[] = [{ accessorKey: 'name', header: 'Name' }];
    const table = buildTable<Person>({ data: [{ name: 'Alice', amount: 1 }], columns });

    const appendSpy = vi.spyOn(document.body, 'appendChild');
    exportTableToCsv(table, 'myfile');

    const anchor = appendSpy.mock.calls.find(
      (c) => (c[0] as HTMLElement).tagName === 'A',
    )?.[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('myfile.csv');
  });
});
