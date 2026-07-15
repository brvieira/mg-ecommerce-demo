import { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  InputBase,
  Button,
  Box,
} from '@mui/material';
import MagnifyingGlassIcon from '@leafygreen-ui/icon/MagnifyingGlass';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCatalog } from '../context/CatalogContext';
import { tokens } from '../theme/theme';
import ProductFormDialog from './ProductFormDialog';

export default function Header() {
  const { query, setQuery } = useCatalog();
  const [draft, setDraft] = useState(query);
  const [formOpen, setFormOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isCatalog = location.pathname === '/';

  const handleSubmit = (e) => {
    e.preventDefault();
    setQuery(draft);
  };

  return (
    <AppBar position="sticky" elevation={0}>
      <Toolbar
        disableGutters
        sx={{
          maxWidth: 1360,
          width: '100%',
          margin: '0 auto',
          px: { xs: 2, md: 4 },
          py: '18px',
          gap: '28px',
          flexWrap: 'wrap',
        }}
      >
        <Typography
          component={Link}
          to="/"
          sx={{
            fontFamily: '"Playfair Display", serif',
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: '0.04em',
            color: tokens.ink,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          MyRetailOnline.com
        </Typography>

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ flex: 1, maxWidth: 520, minWidth: 200, position: 'relative' }}
        >
          <MagnifyingGlassIcon
            size={16}
            fill={tokens.muted}
            style={{
              position: 'absolute',
              left: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          />
          <InputBase
            fullWidth
            placeholder="Buscar por produto, categoria ou marca..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            sx={{
              width: '100%',
              borderRadius: '999px',
              border: '1px solid',
              borderColor: tokens.borderStrong,
              backgroundColor: tokens.surface,
              fontSize: 14,
              color: tokens.ink,
              padding: '11px 16px 11px 40px',
              '&:focus-within': { borderColor: tokens.accent },
            }}
          />
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginLeft: 'auto',
          }}
        >
          <Button
            component={Link}
            to="/"
            disableRipple
            sx={{
              background: 'none',
              padding: '8px 6px',
              fontSize: 14,
              fontWeight: 500,
              color: isCatalog ? tokens.accentFg : tokens.inkSecondary,
              '&:hover': { background: 'none', color: tokens.accentFg },
            }}
          >
            Catálogo
          </Button>
          <Button
            variant="contained"
            onClick={() => setFormOpen(true)}
            sx={{ padding: '11px 20px', whiteSpace: 'nowrap' }}
          >
            + Novo Produto
          </Button>
        </Box>
      </Toolbar>

      <ProductFormDialog
        mode="create"
        open={formOpen}
        product={null}
        onClose={() => setFormOpen(false)}
        onSaved={(product) => {
          setFormOpen(false);
          navigate(`/product/${product._id}`);
        }}
      />
    </AppBar>
  );
}
