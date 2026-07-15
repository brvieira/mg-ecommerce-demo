import { Box, IconButton, Typography } from '@mui/material';
import CodeIcon from '@leafygreen-ui/icon/Code';
import XIcon from '@leafygreen-ui/icon/X';
import { useDebug } from '../context/DebugContext';
import { tokens } from '../theme/theme';
import JsonViewer from './JsonViewer';

export default function DebugPanel() {
  const { isOpen, toggle, close, data } = useDebug();

  return (
    <Box sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 50, fontFamily: 'monospace' }}>
      {isOpen && (
        <Box
          sx={{
            width: { xs: 'calc(100vw - 40px)', sm: 420 },
            maxHeight: '55vh',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: tokens.debugBg,
            borderRadius: '12px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
            overflow: 'hidden',
            mb: '10px',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderBottom: '1px solid',
              borderColor: tokens.debugHeaderBorder,
              flexShrink: 0,
            }}
          >
            <Typography sx={{ color: tokens.debugLabel, fontSize: 12, fontFamily: 'monospace' }}>
              debug · {data?.title || 'sem dados'}
            </Typography>
            <IconButton onClick={close} size="small" aria-label="Fechar" sx={{ color: tokens.debugMuted, padding: '2px' }}>
              <XIcon fill="currentColor" size={14} />
            </IconButton>
          </Box>
          <Box sx={{ overflow: 'auto', padding: '14px' }}>
            {data ? (
              <JsonViewer data={data.payload} />
            ) : (
              <Typography sx={{ color: tokens.debugMuted, fontSize: 12.5, fontFamily: 'monospace' }}>
                Nada para exibir ainda.
              </Typography>
            )}
          </Box>
        </Box>
      )}

      <Box
        component="button"
        type="button"
        onClick={toggle}
        aria-label="Painel de debug"
        sx={{
          backgroundColor: tokens.debugBg,
          color: tokens.debugLabel,
          border: 'none',
          padding: '11px 16px',
          borderRadius: '999px',
          fontSize: 12,
          fontFamily: 'monospace',
          cursor: 'pointer',
          boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <CodeIcon fill="currentColor" size={13} />
        {isOpen ? 'fechar debug' : 'debug'}
      </Box>
    </Box>
  );
}
