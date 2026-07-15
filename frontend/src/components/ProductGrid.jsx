import { Box, Pagination, CircularProgress, Alert, Typography } from '@mui/material';
import ProductCard from './ProductCard';
import { useCatalog } from '../context/CatalogContext';
import { tokens } from '../theme/theme';

export default function ProductGrid() {
  const { items, total, page, setPage, pageLimit, loading, error } = useCatalog();
  const pageCount = Math.max(1, Math.ceil(total / pageLimit));

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: tokens.accent }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!items.length) {
    return (
      <Typography sx={{ py: '80px', textAlign: 'center', fontSize: 15, color: tokens.muted }}>
        Nenhum produto encontrado com os filtros atuais.
      </Typography>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '22px',
        }}
      >
        {items.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Pagination
          count={pageCount}
          page={page}
          onChange={(_, value) => setPage(value)}
          shape="rounded"
          sx={{
            '& .MuiPaginationItem-root': { borderRadius: '8px' },
            '& .Mui-selected': { backgroundColor: `${tokens.ink} !important`, color: tokens.surface },
          }}
        />
      </Box>
    </Box>
  );
}
