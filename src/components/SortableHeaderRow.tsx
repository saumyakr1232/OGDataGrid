import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TableRow } from '@mui/material';
import { flexRender, type Header, type HeaderGroup } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { HeaderCell } from '../styled';
import { HeaderCellContent } from './HeaderCellContent';
import type { AggregationFn, DataGridColumnMeta, Density } from '../types';

const SELECTION_COL_ID = '__select__';

function isReorderable<T>(header: Header<T, unknown>): boolean {
  if (header.id === SELECTION_COL_ID) return false;
  const meta = header.column.columnDef.meta as DataGridColumnMeta<T> | undefined;
  if (meta?.reorderable === false) return false;
  if (header.column.getIsPinned()) return false;
  return true;
}

interface AggregationControls {
  groupingActive: boolean;
  currentAggregations: Record<string, AggregationFn>;
  onSetAggregation: (columnId: string, fn: AggregationFn) => void;
}

export function SortableHeaderRow<T>({
  headerGroup,
  density,
  enableReorder,
  groupingActive,
  currentAggregations,
  onSetAggregation,
}: {
  headerGroup: HeaderGroup<T>;
  density: Density;
  enableReorder: boolean;
} & AggregationControls) {
  const agg: AggregationControls = { groupingActive, currentAggregations, onSetAggregation };

  if (!enableReorder) {
    return (
      <TableRow>
        {headerGroup.headers.map((header) => (
          <RenderHeader key={header.id} header={header} density={density} agg={agg} />
        ))}
      </TableRow>
    );
  }

  const sortableIds = headerGroup.headers.filter(isReorderable).map((h) => h.id);

  return (
    <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
      <TableRow>
        {headerGroup.headers.map((header) =>
          isReorderable(header) ? (
            <SortableHeader key={header.id} header={header} density={density} agg={agg} />
          ) : (
            <RenderHeader key={header.id} header={header} density={density} agg={agg} />
          ),
        )}
      </TableRow>
    </SortableContext>
  );
}

function RenderHeader<T>({
  header,
  density,
  agg,
  extraStyle,
  dragHandleProps,
  setNodeRef,
}: {
  header: Header<T, unknown>;
  density: Density;
  agg: AggregationControls;
  extraStyle?: React.CSSProperties;
  dragHandleProps?: ReactNode;
  setNodeRef?: (el: HTMLElement | null) => void;
}) {
  const pinned = header.column.getIsPinned();
  const pinSide: 'left' | 'right' | null =
    pinned === 'left' ? 'left' : pinned === 'right' ? 'right' : null;
  const pinStyle: React.CSSProperties = pinSide
    ? {
        position: 'sticky',
        left: pinSide === 'left' ? header.column.getStart(pinSide) : undefined,
        right: pinSide === 'right' ? header.column.getAfter(pinSide) : undefined,
        zIndex: 3,
        boxShadow:
          pinSide === 'left'
            ? '2px 0 4px -2px rgba(0,0,0,0.15)'
            : '-2px 0 4px -2px rgba(0,0,0,0.15)',
      }
    : {};
  const isGroupHeader = header.subHeaders.length > 0;
  return (
    <HeaderCell
      ref={setNodeRef as never}
      density={density}
      style={{
        width: header.getSize(),
        textAlign: isGroupHeader ? 'center' : undefined,
        borderBottom: isGroupHeader ? '1px solid' : undefined,
        borderColor: 'divider',
        ...pinStyle,
        ...extraStyle,
      }}
      colSpan={header.colSpan}
    >
      {header.isPlaceholder ? null : header.id === SELECTION_COL_ID ? (
        flexRender(header.column.columnDef.header, header.getContext())
      ) : isGroupHeader ? (
        <span style={{ fontWeight: 600 }}>{flexRender(header.column.columnDef.header, header.getContext())}</span>
      ) : (
        <HeaderCellContent
          header={header}
          dragHandle={dragHandleProps}
          groupingActive={agg.groupingActive}
          currentAggregation={agg.currentAggregations[header.column.id]}
          onSetAggregation={agg.onSetAggregation}
        />
      )}
    </HeaderCell>
  );
}

function SortableHeader<T>({
  header,
  density,
  agg,
}: {
  header: Header<T, unknown>;
  density: Density;
  agg: AggregationControls;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: header.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };
  const handle = (
    <span
      {...attributes}
      {...listeners}
      style={{ cursor: 'grab', padding: '0 4px', display: 'inline-flex', alignItems: 'center', userSelect: 'none' }}
      aria-label={`Drag ${header.id}`}
    >
      ⋮⋮
    </span>
  );
  return (
    <RenderHeader
      header={header}
      density={density}
      agg={agg}
      extraStyle={style}
      dragHandleProps={handle}
      setNodeRef={setNodeRef}
    />
  );
}
