import { useDroppable } from '@dnd-kit/core';
import { Box, Chip, Typography } from '@mui/material';
import type { Table } from '@tanstack/react-table';

const ZONE_ID = 'group-zone-root';

export function GroupZone<T>({
  table,
  visible,
}: {
  table: Table<T>;
  visible: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: ZONE_ID });
  if (!visible) return null;
  const grouping = table.getState().grouping;
  return (
    <Box
      ref={setNodeRef}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 1,
        borderBottom: 1,
        borderColor: 'divider',
        background: isOver ? 'action.hover' : 'background.default',
        minHeight: 44,
        transition: 'background 100ms',
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
        Drop columns here to group:
      </Typography>
      {grouping.length === 0 ? (
        <Typography variant="caption" color="text.disabled">
          (none)
        </Typography>
      ) : (
        grouping.map((g) => (
          <Chip
            key={g}
            size="small"
            label={String(table.getColumn(g)?.columnDef.header ?? g)}
            onDelete={() => table.getColumn(g)?.toggleGrouping()}
          />
        ))
      )}
    </Box>
  );
}

export { ZONE_ID as GROUP_ZONE_ID };
