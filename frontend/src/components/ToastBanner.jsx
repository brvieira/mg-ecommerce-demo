import { Box } from '@mui/material';
import { useToast } from '../context/ToastContext';
import { tokens } from '../theme/theme';

export default function ToastBanner() {
  const { toast } = useToast();
  if (!toast) return null;

  const isError = toast.severity === 'error';

  return (
    <Box sx={{ maxWidth: 1360, margin: '16px auto 0', px: { xs: 2, md: 4 } }}>
      <Box
        sx={{
          backgroundColor: isError ? tokens.dangerBg : tokens.successBg,
          border: '1px solid',
          borderColor: isError ? tokens.danger : tokens.successBorder,
          color: isError ? tokens.danger : tokens.successText,
          padding: '12px 18px',
          borderRadius: '10px',
          fontSize: 14,
        }}
      >
        {toast.message}
      </Box>
    </Box>
  );
}
