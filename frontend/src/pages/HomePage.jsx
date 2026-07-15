import { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import Header from '../components/Header';
import ToastBanner from '../components/ToastBanner';
import Sidebar from '../components/Sidebar';
import ProductGrid from '../components/ProductGrid';
import { useCatalog } from '../context/CatalogContext';
import { useDebug } from '../context/DebugContext';
import { tokens } from '../theme/theme';

export default function HomePage() {
  const { items, total, diagnostics } = useCatalog();
  const { setDebugData } = useDebug();

  useEffect(() => {
    setDebugData(
      diagnostics ? 'Resultados (GET /search)' : 'Resultados (GET /products)',
      diagnostics ? { diagnostics, items } : { items },
    );
  }, [items, diagnostics, setDebugData]);

  return (
    <Box>
      <Header />
      <ToastBanner />
      <Box
        sx={{
          maxWidth: 1360,
          margin: '0 auto',
          padding: { xs: '24px 16px 60px', md: '36px 32px 80px' },
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '240px 1fr' },
          gap: '36px',
        }}
      >
        <Sidebar />

        <Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: '22px' }}>
            <Typography variant="h2">Catálogo</Typography>
            <Typography sx={{ fontSize: 13, color: tokens.muted }}>
              {total} produto{total === 1 ? '' : 's'}
            </Typography>
          </Box>
          <ProductGrid />
        </Box>
      </Box>
    </Box>
  );
}
