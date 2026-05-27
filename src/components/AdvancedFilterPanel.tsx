import {
  Box,
  Button,
  Drawer,
  IconButton,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import type { Column, Table } from '@tanstack/react-table';
import type {
  AdvancedFilterGroup,
  AdvancedFilterRule,
  DataGridColumnMeta,
} from '../types';

type AnyColumn = Column<unknown, unknown>;

const OPERATORS_BY_VARIANT: Record<string, AdvancedFilterRule['op'][]> = {
  text: ['contains', 'notContains', 'equals', 'notEquals', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'],
  number: ['equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'between', 'isEmpty', 'isNotEmpty'],
  date: ['equals', 'gt', 'gte', 'lt', 'lte', 'between', 'isEmpty', 'isNotEmpty'],
  select: ['equals', 'notEquals', 'inList', 'isEmpty', 'isNotEmpty'],
  multiSelect: ['inList', 'isEmpty', 'isNotEmpty'],
  boolean: ['equals', 'isEmpty', 'isNotEmpty'],
};

const OP_LABELS: Record<AdvancedFilterRule['op'], string> = {
  equals: '=',
  notEquals: '≠',
  contains: 'contains',
  notContains: 'does not contain',
  startsWith: 'starts with',
  endsWith: 'ends with',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  between: 'between',
  inList: 'in list (comma-sep)',
  isEmpty: 'is empty',
  isNotEmpty: 'is not empty',
};

let uid = 0;
const nextId = () => `f${++uid}`;

function newRule(columnId: string): AdvancedFilterRule {
  return { id: nextId(), columnId, op: 'contains', value: '' };
}

function newGroup(): AdvancedFilterGroup {
  return { id: nextId(), combinator: 'AND', rules: [] };
}

export function AdvancedFilterPanel<T>({
  open,
  onClose,
  table,
  value,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  table: Table<T>;
  value: AdvancedFilterGroup | null;
  onChange: (v: AdvancedFilterGroup | null) => void;
}) {
  const rootGroup = value ?? newGroup();
  const columns = table.getAllLeafColumns().filter((c) => c.getCanFilter()) as unknown as AnyColumn[];

  const update = (next: AdvancedFilterGroup) => {
    onChange(next.rules.length === 0 ? null : { ...next });
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 480 } }}>
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Advanced filters
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Combine rules with AND / OR. Nested groups are supported.
        </Typography>
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <GroupEditor
            group={rootGroup}
            columns={columns}
            onChange={update}
            isRoot
          />
        </Box>
        <Divider sx={{ my: 1 }} />
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button onClick={() => onChange(null)} color="warning">Clear all</Button>
          <Button onClick={onClose} variant="contained">Done</Button>
        </Box>
      </Box>
    </Drawer>
  );
}

interface GroupEditorProps {
  group: AdvancedFilterGroup;
  columns: AnyColumn[];
  onChange: (g: AdvancedFilterGroup) => void;
  isRoot?: boolean;
  onDelete?: () => void;
}

function GroupEditor({ group, columns, onChange, isRoot, onDelete }: GroupEditorProps) {
  const set = (rules: AdvancedFilterGroup['rules']) => onChange({ ...group, rules });
  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        p: 1.5,
        mb: 1,
        background: isRoot ? 'transparent' : 'action.hover',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={group.combinator}
          onChange={(_, v) => v && onChange({ ...group, combinator: v })}
        >
          <ToggleButton value="AND">AND</ToggleButton>
          <ToggleButton value="OR">OR</ToggleButton>
        </ToggleButtonGroup>
        <Box sx={{ flex: 1 }} />
        {!isRoot && onDelete && (
          <IconButton size="small" onClick={onDelete} aria-label="Remove group">
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      {group.rules.map((r, i) =>
        'combinator' in r ? (
          <GroupEditor
            key={r.id}
            group={r as AdvancedFilterGroup}
            columns={columns}
            onChange={(g) => {
              const next = [...group.rules];
              next[i] = g;
              set(next);
            }}
            onDelete={() => set(group.rules.filter((_, j) => j !== i))}
          />
        ) : (
          <RuleEditor
            key={r.id}
            rule={r as AdvancedFilterRule}
            columns={columns}
            onChange={(rule) => {
              const next = [...group.rules];
              next[i] = rule;
              set(next);
            }}
            onDelete={() => set(group.rules.filter((_, j) => j !== i))}
          />
        ),
      )}
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => {
            const first = columns[0];
            if (!first) return;
            set([...group.rules, newRule(first.id)]);
          }}
        >
          Add rule
        </Button>
        <Button
          size="small"
          startIcon={<CreateNewFolderIcon />}
          onClick={() => set([...group.rules, newGroup()])}
        >
          Add group
        </Button>
      </Box>
    </Box>
  );
}

function RuleEditor({
  rule,
  columns,
  onChange,
  onDelete,
}: {
  rule: AdvancedFilterRule;
  columns: GroupEditorProps['columns'];
  onChange: (r: AdvancedFilterRule) => void;
  onDelete: () => void;
}) {
  const col = columns.find((c) => c.id === rule.columnId) ?? columns[0];
  const meta = col?.columnDef.meta as DataGridColumnMeta<unknown> | undefined;
  const variant = meta?.filterVariant ?? 'text';
  const ops = OPERATORS_BY_VARIANT[variant] ?? OPERATORS_BY_VARIANT.text;
  const needsValue = !['isEmpty', 'isNotEmpty'].includes(rule.op);
  const needsSecond = rule.op === 'between';

  return (
    <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center', flexWrap: 'wrap' }}>
      <Select
        size="small"
        value={rule.columnId}
        onChange={(e) => onChange({ ...rule, columnId: String(e.target.value) })}
        sx={{ minWidth: 140 }}
      >
        {columns.map((c) => (
          <MenuItem key={c.id} value={c.id}>
            {String(c.columnDef.header ?? c.id)}
          </MenuItem>
        ))}
      </Select>
      <Select
        size="small"
        value={rule.op}
        onChange={(e) => onChange({ ...rule, op: e.target.value as AdvancedFilterRule['op'] })}
        sx={{ minWidth: 140 }}
      >
        {ops.map((op) => (
          <MenuItem key={op} value={op}>
            {OP_LABELS[op]}
          </MenuItem>
        ))}
      </Select>
      {needsValue && (
        <TextField
          size="small"
          value={(rule.value as string) ?? ''}
          onChange={(e) => onChange({ ...rule, value: parseValue(e.target.value, rule.op, variant) })}
          placeholder="Value"
          sx={{ flex: 1, minWidth: 120 }}
        />
      )}
      {needsSecond && (
        <TextField
          size="small"
          value={(rule.value2 as string) ?? ''}
          onChange={(e) => onChange({ ...rule, value2: parseValue(e.target.value, rule.op, variant) })}
          placeholder="And"
          sx={{ flex: 1, minWidth: 120 }}
        />
      )}
      <IconButton size="small" onClick={onDelete} aria-label="Remove rule">
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

function parseValue(raw: string, op: AdvancedFilterRule['op'], variant: string): unknown {
  if (op === 'inList') return raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (variant === 'number') {
    const n = Number(raw);
    return Number.isNaN(n) ? raw : n;
  }
  if (variant === 'boolean') return raw === 'true';
  return raw;
}
