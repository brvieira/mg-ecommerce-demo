import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import Header from '../components/Header';
import ToastBanner from '../components/ToastBanner';
import ProductCard from '../components/ProductCard';
import ProductFormDialog from '../components/ProductFormDialog';
import * as productsService from '../services/productsService';
import * as ordersService from '../services/ordersService';
import { useDebug } from '../context/DebugContext';
import { useToast } from '../context/ToastContext';
import { tokens } from '../theme/theme';

export default function ProductDetailsPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [inventoryOverrides, setInventoryOverrides] = useState({});
  const [buyingSku, setBuyingSku] = useState(null);
  const { setDebugData, showDebug } = useDebug();
  const { showToast } = useToast();

  useEffect(() => {
    setLoading(true);
    setError(null);
    setProduct(null);
    setSimilar([]);
    setInventoryOverrides({});
    productsService
      .getById(id)
      .then((data) => {
        setProduct(data);
        return productsService.getSimilar(id);
      })
      .then(setSimilar)
      .catch((err) => setError(err.response?.status === 404 ? 'Produto não encontrado.' : 'Erro ao carregar produto.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (product) setDebugData('Produto (GET /products/:id + /similar)', { product, similar });
  }, [product, similar, setDebugData]);

  const handleBuy = async (sku) => {
    const inventory = inventoryOverrides[sku.sku] ?? sku.inventory;
    if (inventory <= 0 || buyingSku) return;
    setBuyingSku(sku.sku);
    try {
      const order = await ordersService.createOrder({ productId: product._id, sku: sku.sku, quantity: 1 });
      setInventoryOverrides((prev) => ({ ...prev, [sku.sku]: inventory - 1 }));
      showToast('Pedido simulado criado com sucesso.');
      showDebug('Pedido criado (POST /orders)', order);
    } catch (err) {
      const message = err.response?.status === 409 ? 'Produto sem estoque disponível.' : 'Não foi possível concluir a compra.';
      showToast(message, 'error');
    } finally {
      setBuyingSku(null);
    }
  };

  const totalStock = product?.skus?.reduce((sum, s) => sum + (inventoryOverrides[s.sku] ?? s.inventory), 0) ?? 0;
  const inStock = totalStock > 0;
  const primaryCategory = product?.categories?.[0]?.name;

  return (
    <Box>
      <Header />
      <ToastBanner />
      <Box sx={{ maxWidth: 1200, margin: '0 auto', padding: { xs: '24px 16px 60px', md: '36px 32px 90px' } }}>
        <Typography sx={{ fontSize: 13, color: tokens.muted, mb: '24px' }}>
          <Box component={Link} to="/" sx={{ color: tokens.accent, textDecoration: 'none', '&:hover': { color: tokens.accentHover } }}>
            Catálogo
          </Box>
          {primaryCategory ? ` / ${primaryCategory}` : ''}
        </Typography>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: tokens.accent }} />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {product && !loading && !error && (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: '28px', md: '52px' } }}>
              <Box>
                <Box
                  component="img"
                  src={product.images?.[0]}
                  alt={product.name}
                  sx={{ width: '100%', aspectRatio: '1', borderRadius: '16px', mb: 1, objectFit: 'cover' }}
                />
                <Stack direction="row" spacing={1} sx={{ overflowX: 'auto' }}>
                  {product.images?.slice(1).map((img, i) => (
                    <Box key={i} component="img" src={img} alt="" sx={{ width: 72, height: 72, borderRadius: '8px', objectFit: 'cover' }} />
                  ))}
                </Stack>
              </Box>

              <Box>
                <Typography sx={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: tokens.mutedStrong, mb: '10px' }}>
                  {product.categories?.map((c) => c.name).join(' · ')} {product.brand?.name ? `· ${product.brand.name}` : ''}
                </Typography>
                <Typography variant="h1" sx={{ mb: '14px' }}>
                  {product.name}
                </Typography>
                <Typography sx={{ fontSize: 26, fontWeight: 600, color: tokens.ink, mb: '22px' }}>
                  a partir de R${Number(product.priceFrom).toFixed(2)}
                </Typography>
                <Typography variant="body1" sx={{ mb: '24px' }}>
                  {product.description}
                </Typography>

                <Box
                  sx={{
                    display: 'flex',
                    gap: '24px',
                    fontSize: 13,
                    color: tokens.mutedStrong,
                    mb: '28px',
                    borderTop: '1px solid',
                    borderBottom: '1px solid',
                    borderColor: tokens.border,
                    padding: '16px 0',
                  }}
                >
                  <Box>
                    <Box component="span" sx={{ color: tokens.inkSecondary, fontWeight: 500 }}>SKUs</Box> {product.skus?.length ?? 0}
                  </Box>
                  <Box sx={{ color: inStock ? tokens.successLabel : tokens.danger, fontWeight: 500 }}>
                    {inStock ? `${totalStock} unidades em estoque` : 'Indisponível no momento'}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: '12px', mb: '32px' }}>
                  <Button variant="contained" onClick={() => setEditOpen(true)}>
                    Editar produto
                  </Button>
                  <Button component={Link} to="/" variant="outlined">
                    Voltar ao catálogo
                  </Button>
                </Box>

                {product.attributes && Object.keys(product.attributes).length > 0 && (
                  <>
                    <Typography variant="h6" sx={{ mb: '12px' }}>
                      Atributos
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px', mb: '28px' }}>
                      {Object.entries(product.attributes).map(([key, value]) => (
                        <Box key={key}>
                          <Typography sx={{ fontSize: 11, textTransform: 'capitalize', color: tokens.mutedStrong }}>{key}</Typography>
                          <Typography sx={{ fontSize: 13, fontWeight: 600, color: tokens.ink }}>{String(value)}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </>
                )}

                <Typography variant="h6" sx={{ mb: '12px' }}>
                  SKUs disponíveis
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>SKU</TableCell>
                      <TableCell>Cor</TableCell>
                      <TableCell>Tamanho</TableCell>
                      <TableCell align="right">Preço</TableCell>
                      <TableCell align="right">Estoque</TableCell>
                      <TableCell align="right">Ação</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {product.skus?.map((sku) => {
                      const inventory = inventoryOverrides[sku.sku] ?? sku.inventory;
                      const soldOut = inventory <= 0;
                      return (
                        <TableRow key={sku.sku}>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: 12.5 }}>{sku.sku}</TableCell>
                          <TableCell>{sku.color}</TableCell>
                          <TableCell>{sku.size}</TableCell>
                          <TableCell align="right">R${Number(sku.price).toFixed(2)}</TableCell>
                          <TableCell align="right">
                            {soldOut ? (
                              <Chip size="small" label="Esgotado" sx={{ backgroundColor: tokens.dangerBg, color: tokens.danger }} />
                            ) : (
                              `${inventory} un.`
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="outlined"
                              disabled={soldOut || buyingSku === sku.sku}
                              onClick={() => handleBuy(sku)}
                            >
                              Comprar
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            </Box>

            {similar.length > 0 && (
              <Box sx={{ mt: '72px' }}>
                <Typography variant="h3" sx={{ mb: '20px' }}>
                  Produtos semelhantes
                </Typography>
                <Typography sx={{ fontSize: 12, color: tokens.muted, display: 'block', mb: '20px', mt: '-14px' }}>
                  via Atlas Vector Search — similaridade semântica, pode cruzar categorias.
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                    gap: '20px',
                  }}
                >
                  {similar.map((item) => (
                    <ProductCard key={item._id} product={item} />
                  ))}
                </Box>
              </Box>
            )}
          </>
        )}

        <ProductFormDialog
          mode="edit"
          open={editOpen}
          product={product}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => {
            setProduct(updated);
            setEditOpen(false);
          }}
        />
      </Box>
    </Box>
  );
}
