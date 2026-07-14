import { useState, type ReactNode } from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

const COLORS = {
  key: '#0b7285',
  string: '#2b8a3e',
  keyword: '#c92a2a',
  number: '#1971c2',
};

// Matches a quoted string (optionally a key when followed by `:`), a
// boolean/null keyword, or a number. Good enough for pretty-printed JSON.
const JSON_TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?)/g;

function highlightJson(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  JSON_TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = JSON_TOKEN.exec(code)) !== null) {
    if (m.index > last) out.push(code.slice(last, m.index));
    const [full, str, colon, keyword, num] = m;
    if (str && colon) {
      out.push(<span key={k++} style={{ color: COLORS.key }}>{str}</span>, colon);
    } else if (str) {
      out.push(<span key={k++} style={{ color: COLORS.string }}>{str}</span>);
    } else if (keyword) {
      out.push(<span key={k++} style={{ color: COLORS.keyword }}>{keyword}</span>);
    } else if (num) {
      out.push(<span key={k++} style={{ color: COLORS.number }}>{num}</span>);
    } else {
      out.push(full);
    }
    last = JSON_TOKEN.lastIndex;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

export interface CodeBlockProps {
  code: string;
  /** `json` gets syntax coloring; anything else renders as plain monospace. */
  language?: 'json' | 'text';
  /** Caption in the header bar (e.g. a filename). */
  title?: string;
  maxHeight?: number | string;
}

export function CodeBlock({ code, language = 'json', title, maxHeight = 420 }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
        bgcolor: '#fbfcfd',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 0.5,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'grey.50',
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
          {title ?? language}
        </Typography>
        <Tooltip title={copied ? 'Copied!' : 'Copy'}>
          <IconButton size="small" onClick={copy} aria-label="Copy code">
            {copied ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.5,
          maxHeight,
          overflow: 'auto',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          fontSize: 12.5,
          lineHeight: 1.6,
          tabSize: 2,
        }}
      >
        <code>{language === 'json' ? highlightJson(code) : code}</code>
      </Box>
    </Box>
  );
}
