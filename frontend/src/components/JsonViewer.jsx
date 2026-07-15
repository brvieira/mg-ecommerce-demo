import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { tokens } from '../theme/theme';

// Arrays maiores que isso (ex: o vetor `embedding`, com 1536 floats) começam
// colapsados por padrão — ver SPEC_V2.md 2.4.
const LONG_ARRAY_THRESHOLD = 20;

// Cores legíveis sobre o fundo quase-preto do painel de debug (tokens.debugBg) —
// não os tokens de texto padrão do tema, que assumem fundo claro.
const TYPE_COLOR = {
  string: tokens.debugText,
  number: 'oklch(75% 0.12 230)',
  boolean: 'oklch(80% 0.12 80)',
  null: tokens.debugMuted,
};

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function Primitive({ value }) {
  const type = typeOf(value);
  const text = type === 'string' ? `"${value}"` : String(value);
  return (
    <Typography component="span" sx={{ color: TYPE_COLOR[type] || tokens.debugLabel, fontFamily: 'monospace', fontSize: 11.5 }}>
      {text}
    </Typography>
  );
}

function JsonNode({ label, value, depth = 0 }) {
  const type = typeOf(value);
  const isContainer = type === 'object' || type === 'array';

  if (!isContainer) {
    return (
      <Box sx={{ fontFamily: 'monospace', fontSize: 11.5, lineHeight: 1.6 }}>
        {label != null && (
          <Typography component="span" sx={{ color: tokens.debugMuted, fontFamily: 'monospace', fontSize: 11.5 }}>
            {label}:{' '}
          </Typography>
        )}
        <Primitive value={value} />
      </Box>
    );
  }

  const entries = type === 'array' ? value.map((v, i) => [i, v]) : Object.entries(value);
  const isLongArray = type === 'array' && value.length > LONG_ARRAY_THRESHOLD;
  const [collapsed, setCollapsed] = useState(isLongArray);
  const summary = type === 'array' ? `Array(${value.length})` : `Object(${entries.length})`;

  return (
    <Box sx={{ fontFamily: 'monospace', fontSize: 11.5, lineHeight: 1.6 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
        {label != null && (
          <Typography component="span" sx={{ color: tokens.debugMuted, fontFamily: 'monospace', fontSize: 11.5 }}>
            {label}:
          </Typography>
        )}
        <Box
          component="button"
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          sx={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: 11.5,
            color: tokens.debugLabel,
            '&:hover': { color: tokens.debugText },
          }}
        >
          {collapsed ? `▶ ${summary}${isLongArray ? ' — clique para expandir' : ''}` : `▼ ${summary}`}
        </Box>
      </Box>
      {!collapsed && (
        <Box sx={{ borderLeft: '1px solid', borderColor: tokens.debugHeaderBorder, pl: 1.5, ml: 0.5 }}>
          {entries.map(([key, val]) => (
            <JsonNode key={key} label={type === 'array' ? null : key} value={val} depth={depth + 1} />
          ))}
        </Box>
      )}
    </Box>
  );
}

export default function JsonViewer({ data }) {
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <JsonNode value={data} />
    </Box>
  );
}
