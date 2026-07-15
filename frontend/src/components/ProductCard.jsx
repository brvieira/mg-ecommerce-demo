import { useState } from 'react';
import { Card, CardMedia, CardContent, CardActions, Typography, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import * as ordersService from '../services/ordersService';
import { useDebug } from '../context/DebugContext';
import { useToast } from '../context/ToastContext';
import { tokens } from '../theme/theme';

function cheapestSku(product) {
  if (!product.skus?.length) return null;
  return product.skus.reduce((min, sku) => (sku.price < min.price ? sku : min), product.skus[0]);
}

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const { showDebug } = useDebug();
  const { showToast } = useToast();
  const category = product.categories?.[0]?.name;
  const sku = cheapestSku(product);

  const [inventoryOverride, setInventoryOverride] = useState(null);
  const [buying, setBuying] = useState(false);

  const inventory = inventoryOverride ?? sku?.inventory ?? 0;
  const soldOut = !sku || inventory <= 0;

  const handleBuy = async (e) => {
    e.stopPropagation();
    if (!sku || soldOut || buying) return;
    setBuying(true);
    try {
      const order = await ordersService.createOrder({ productId: product._id, sku: sku.sku, quantity: 1 });
      setInventoryOverride(inventory - 1);
      showToast('Pedido simulado criado com sucesso.');
      showDebug('Pedido criado (POST /orders)', order);
    } catch (err) {
      const message = err.response?.status === 409 ? 'Produto sem estoque disponível.' : 'Não foi possível concluir a compra.';
      showToast(message, 'error');
    } finally {
      setBuying(false);
    }
  };

  return (
    <Card
      onClick={() => navigate(`/product/${product._id}`)}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'box-shadow .15s, transform .15s',
        '&:hover': { boxShadow: '0 8px 24px rgba(0,0,0,0.08)' },
      }}
    >
      <CardMedia
        component="img"
        image={product.images?.[0]}
        alt={product.name}
        sx={{ aspectRatio: '1', objectFit: 'cover' }}
      />
      <CardContent sx={{ flexGrow: 1, padding: '16px' }}>
        <Typography sx={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: tokens.mutedStrong, mb: '6px' }}>
          {category} {category && product.brand?.name ? '· ' : ''}
          {product.brand?.name}
        </Typography>
        <Typography variant="h5" sx={{ mb: '8px', lineHeight: 1.3 }}>
          {product.name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 15, fontWeight: 600, color: tokens.ink }}>
            a partir de R${Number(product.priceFrom).toFixed(2)}
          </Typography>
        </Box>
        <Typography sx={{ mt: '8px', fontSize: 12, color: soldOut ? tokens.danger : tokens.mutedStrong }}>
          {soldOut ? 'Indisponível' : `${inventory} em estoque`}
        </Typography>
      </CardContent>
      <CardActions sx={{ gap: 1, px: '16px', pb: '16px' }}>
        <Button fullWidth size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); navigate(`/product/${product._id}`); }}>
          Ver detalhes
        </Button>
        <Button fullWidth size="small" variant="contained" disabled={soldOut || buying} onClick={handleBuy}>
          {soldOut ? 'Esgotado' : 'Comprar'}
        </Button>
      </CardActions>
    </Card>
  );
}
