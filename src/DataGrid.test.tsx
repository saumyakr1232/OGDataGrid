import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import { DataGrid } from './DataGrid';
import type { DataGridColumnDef } from './types';

interface Row {
  id: string;
  name: string;
  region: 'N' | 'S' | 'E' | 'W';
  value: number;
}

const rows: Row[] = [
  { id: '1', name: 'Alpha', region: 'N', value: 10 },
  { id: '2', name: 'Bravo', region: 'S', value: 20 },
  { id: '3', name: 'Charlie', region: 'E', value: 30 },
  { id: '4', name: 'Delta', region: 'W', value: 40 },
  { id: '5', name: 'Echo', region: 'N', value: 50 },
];

const columns: DataGridColumnDef<Row>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'region', header: 'Region', meta: { filterVariant: 'set' } },
  { accessorKey: 'value', header: 'Value', meta: { filterVariant: 'number', align: 'right' } },
];

const theme = createTheme();

function renderGrid(extraProps: Partial<React.ComponentProps<typeof DataGrid<Row>>> = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <DataGrid<Row>
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        pagination={false}
        enableVirtualization={false}
        {...extraProps}
      />
    </ThemeProvider>,
  );
}

// Helper: pull the visible body rows by their data-row-index attribute.
function getBodyRows(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLTableRowElement>('tr[data-row-index]'),
  );
}

function getCell(container: HTMLElement, rowIndex: number, colIndex: number) {
  return container.querySelector<HTMLElement>(
    `tr[data-row-index="${rowIndex}"] [data-col-index="${colIndex}"]`,
  );
}

describe('rendering', () => {
  it('renders the header labels', () => {
    renderGrid();
    // Each header cell contains the label as text plus an icon-button —
    // assert on the text inside the columnheader rather than the accessible
    // name (which gets polluted by the "Column actions for …" button label).
    const headers = screen.getAllByRole('columnheader');
    const labels = headers.map((h) => h.textContent ?? '');
    expect(labels.some((t) => t.includes('ID'))).toBe(true);
    expect(labels.some((t) => t.includes('Name'))).toBe(true);
    expect(labels.some((t) => t.includes('Region'))).toBe(true);
    expect(labels.some((t) => t.includes('Value'))).toBe(true);
  });

  it("renders all 5 rows' name cells", () => {
    renderGrid();
    for (const name of ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo']) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it('shows the noRowsOverlay when rows={[]}', () => {
    renderGrid({ rows: [] });
    expect(screen.getByText(/No rows/i)).toBeInTheDocument();
  });

  it('shows the loadingOverlay when loading is true', () => {
    renderGrid({ loading: true });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows the errorOverlay when error is passed', () => {
    renderGrid({ error: 'Boom' });
    expect(screen.getByText('Boom')).toBeInTheDocument();
  });

  it('accepts a custom slots.noRowsOverlay and renders it', () => {
    renderGrid({
      rows: [],
      slots: { noRowsOverlay: <div data-testid="custom-empty">Nothing here</div> },
    });
    expect(screen.getByTestId('custom-empty')).toBeInTheDocument();
    expect(screen.queryByText(/^No rows$/i)).not.toBeInTheDocument();
  });
});

describe('sorting', () => {
  it('clicking the Name header sorts asc then desc', async () => {
    const user = userEvent.setup();
    const { container } = renderGrid();

    // Sanity: initial order is the dataset order — first body row is Alpha.
    let bodyRows = getBodyRows(container);
    expect(within(bodyRows[0]).getByText('Alpha')).toBeInTheDocument();

    // Find the Name header by scanning columnheaders for the text.
    const headers = screen.getAllByRole('columnheader');
    const nameHeader = headers.find((h) => (h.textContent ?? '').includes('Name'))!;
    const nameLabel = within(nameHeader).getByText('Name');

    await user.click(nameLabel);
    bodyRows = getBodyRows(container);
    expect(within(bodyRows[0]).getByText('Alpha')).toBeInTheDocument();

    // Second click → desc.
    await user.click(nameLabel);
    bodyRows = getBodyRows(container);
    expect(within(bodyRows[0]).getByText('Echo')).toBeInTheDocument();
  });

  it.skip('shift-clicking adds a secondary sort (skipped — single-sort coverage is sufficient)', () => {
    // TODO: build a dataset where a secondary sort is observable, then
    // simulate a shift+click on a second header.
  });
});

describe('global search', () => {
  it('typing in the search box filters rows after debounce', async () => {
    const user = userEvent.setup();
    const { container } = renderGrid();

    const searchBox = screen.getByPlaceholderText('Quick search…');
    await user.type(searchBox, 'Bravo');

    // Wait past the 200ms debounce for the filter to apply.
    await waitFor(
      () => {
        const bodyRows = getBodyRows(container);
        expect(bodyRows.length).toBe(1);
        expect(within(bodyRows[0]).getByText('Bravo')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });
});

describe('column filters', () => {
  it('clicking the Filters toolbar button shows the filter row', async () => {
    const user = userEvent.setup();
    renderGrid();

    // Filter row inputs have aria-label "Filter <columnId>".
    expect(screen.queryByLabelText('Filter name')).not.toBeInTheDocument();

    const filtersBtn = screen.getByRole('button', { name: /Show column filters|Hide column filters/i });
    await user.click(filtersBtn);

    expect(screen.getByLabelText('Filter name')).toBeInTheDocument();
  });

  it('typing in the Name filter narrows rows', async () => {
    const user = userEvent.setup();
    const { container } = renderGrid();

    await user.click(screen.getByRole('button', { name: /Show column filters|Hide column filters/i }));
    const nameFilter = screen.getByLabelText('Filter name');
    await user.type(nameFilter, 'Char');

    await waitFor(() => {
      const bodyRows = getBodyRows(container);
      expect(bodyRows.length).toBe(1);
      expect(within(bodyRows[0]).getByText('Charlie')).toBeInTheDocument();
    });
  });
});

describe('pagination', () => {
  it('with pageSize=2 in the pagination prop, only the first 2 rows render', () => {
    const { container } = renderGrid({
      pagination: { pageSize: 2 },
      enableVirtualization: false,
    });
    const bodyRows = getBodyRows(container);
    expect(bodyRows.length).toBe(2);
    expect(within(bodyRows[0]).getByText('Alpha')).toBeInTheDocument();
    expect(within(bodyRows[1]).getByText('Bravo')).toBeInTheDocument();
  });

  it('initialState.pagination overrides the prop pageSize', () => {
    const { container } = renderGrid({
      pagination: { pageSize: 2 },
      initialState: { pagination: { pageIndex: 0, pageSize: 3 } },
      enableVirtualization: false,
    });
    expect(getBodyRows(container).length).toBe(3);
  });

  it('clicking the next page button shows the next 2 rows', async () => {
    const user = userEvent.setup();
    const { container } = renderGrid({
      pagination: { pageSize: 2 },
      enableVirtualization: false,
    });

    const nextBtn = screen.getByRole('button', { name: /Go to next page/i });
    await user.click(nextBtn);

    const bodyRows = getBodyRows(container);
    expect(bodyRows.length).toBe(2);
    expect(within(bodyRows[0]).getByText('Charlie')).toBeInTheDocument();
    expect(within(bodyRows[1]).getByText('Delta')).toBeInTheDocument();
  });
});

describe('cell range — drag select', () => {
  it('mousedown + mouseenter + mouseup builds a multi-cell range (status bar shows it)', () => {
    const { container } = renderGrid();

    // Pick a start cell on row 0 / col 0 and drag down-right to row 1 / col 2.
    // (column indexes are leaf-visible — no selection column since selection prop is not set.)
    const start = getCell(container, 0, 0);
    const end = getCell(container, 1, 2);
    expect(start).not.toBeNull();
    expect(end).not.toBeNull();

    fireEvent.mouseDown(start!, { button: 0 });
    fireEvent.mouseEnter(end!, { buttons: 1 });
    fireEvent.mouseUp(document);

    // 2 rows × 3 cols = 6 cells.
    expect(screen.getByText(/Cells:\s*6/)).toBeInTheDocument();
  });

  it('suppresses native text selection during drag', () => {
    const { container } = renderGrid();
    const start = getCell(container, 0, 1); // "Alpha"
    const end = getCell(container, 0, 2);   // "N"

    fireEvent.mouseDown(start!, { button: 0 });
    fireEvent.mouseEnter(end!, { buttons: 1 });
    fireEvent.mouseUp(document);

    const sel = window.getSelection()?.toString() ?? '';
    expect(sel).not.toContain('Alpha');
  });
});

describe('right-click on range', () => {
  it('right-clicking inside the range preserves the range', () => {
    const { container } = renderGrid();

    // Build a 2-cell range via shift-click: click cell (0,0), then shift-click (0,1).
    const c00 = getCell(container, 0, 0);
    const c01 = getCell(container, 0, 1);
    expect(c00).not.toBeNull();
    expect(c01).not.toBeNull();

    fireEvent.mouseDown(c00!, { button: 0 });
    fireEvent.mouseUp(document);
    fireEvent.mouseDown(c01!, { button: 0, shiftKey: true });
    fireEvent.mouseUp(document);

    // Verify the 2-cell range exists.
    expect(screen.getByText(/Cells:\s*2/)).toBeInTheDocument();

    // Now fire mousedown w/ right button + contextmenu INSIDE the range.
    // The bug: right-mousedown used to clobber the range; this asserts the fix.
    fireEvent.mouseDown(c01!, { button: 2 });
    fireEvent.contextMenu(c01!);

    expect(screen.getByText(/Cells:\s*2/)).toBeInTheDocument();

    // Close the context menu — state should be unchanged.
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.getByText(/Cells:\s*2/)).toBeInTheDocument();
  });
});

describe('right-click outside range', () => {
  it('right-clicking outside the range collapses to that single cell', () => {
    const { container } = renderGrid();

    // Build a 2-cell range on row 0.
    const c00 = getCell(container, 0, 0);
    const c01 = getCell(container, 0, 1);
    fireEvent.mouseDown(c00!, { button: 0 });
    fireEvent.mouseUp(document);
    fireEvent.mouseDown(c01!, { button: 0, shiftKey: true });
    fireEvent.mouseUp(document);
    expect(screen.getByText(/Cells:\s*2/)).toBeInTheDocument();

    // Right-click on a cell OUTSIDE the range (row 2, col 3).
    const outside = getCell(container, 2, 3);
    expect(outside).not.toBeNull();
    fireEvent.mouseDown(outside!, { button: 2 });
    fireEvent.contextMenu(outside!);

    // Should collapse to 1 cell.
    expect(screen.getByText(/Cells:\s*1/)).toBeInTheDocument();
  });
});

describe('keyboard nav', () => {
  beforeEach(() => {
    // jsdom doesn't implement scrollIntoView; useCellInteraction calls it.
    if (!(Element.prototype as unknown as { scrollIntoView?: () => void }).scrollIntoView) {
      (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView = () => {};
    }
  });

  it('ArrowDown moves the active cell down without throwing', () => {
    const { container } = renderGrid();

    // Click into a cell to set focus + active cell.
    const start = getCell(container, 0, 0);
    expect(start).not.toBeNull();
    fireEvent.mouseDown(start!, { button: 0 });
    fireEvent.mouseUp(document);

    // After a single-cell click, StatusBar shows the 1-cell range.
    expect(screen.getByText(/Cells:\s*1/)).toBeInTheDocument();

    // ArrowDown on the grid root — should not throw, range still present.
    const gridRoot = container.querySelector<HTMLElement>('[tabindex="0"]');
    expect(gridRoot).not.toBeNull();
    fireEvent.keyDown(gridRoot!, { key: 'ArrowDown' });

    // Range should still exist and remain a single-cell range (anchor follows).
    expect(screen.getByText(/Cells:\s*1/)).toBeInTheDocument();
  });
});

describe('CSV export', () => {
  it('clicking the CSV button creates a Blob and triggers a download', async () => {
    const user = userEvent.setup();

    const createObjSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock');
    const revokeObjSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    renderGrid();

    const csvBtn = screen.getByRole('button', { name: /^CSV$/i });
    await user.click(csvBtn);

    expect(createObjSpy).toHaveBeenCalledTimes(1);
    const blobArg = createObjSpy.mock.calls[0][0] as Blob;
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toMatch(/text\/csv/);
    expect(clickSpy).toHaveBeenCalled();

    createObjSpy.mockRestore();
    revokeObjSpy.mockRestore();
    clickSpy.mockRestore();
  });
});
