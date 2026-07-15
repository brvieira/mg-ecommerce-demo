import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Stack,
  IconButton,
  Typography,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import PlusIcon from '@leafygreen-ui/icon/Plus';
import TrashIcon from '@leafygreen-ui/icon/Trash';
import * as filtersService from '../services/filtersService';
import * as productsService from '../services/productsService';
import { useToast } from '../context/ToastContext';

const EMPTY_SKU = { sku: '', color: '', size: '', price: '', inventory: '' };
const EMPTY_ATTRIBUTE = { key: '', value: '' };

function skusFromProduct(product) {
  if (!product?.skus?.length) return [{ ...EMPTY_SKU }];
  return product.skus.map((s) => ({
    sku: s.sku,
    color: s.color,
    size: s.size || '',
    price: String(s.price),
    inventory: String(s.inventory),
    gtin: s.gtin,
    existing: true,
  }));
}

function attributesFromProduct(product) {
  const entries = Object.entries(product?.attributes || {});
  if (!entries.length) return [{ ...EMPTY_ATTRIBUTE }];
  return entries.map(([key, value]) => ({ key, value: String(value) }));
}

// Cria e edita produtos (SPEC_V2 2.1/2.2). Reaproveitada nos dois modos porque
// os campos são quase idênticos — a única diferença de comportamento é que
// SKUs já existentes não podem ser removidos aqui (apenas editados ou
// complementados com novos), ver docs/DIVERGENCES.md.
export default function ProductFormDialog({ mode, open, product, onClose, onSaved }) {
  const isEdit = mode === 'edit';
  const { showToast } = useToast();

  const [options, setOptions] = useState({ brands: [], categories: [] });
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState(null);
  const [categories, setCategories] = useState([]);
  const [imageUrl, setImageUrl] = useState('');
  const [attributeRows, setAttributeRows] = useState([{ ...EMPTY_ATTRIBUTE }]);
  const [skuRows, setSkuRows] = useState([{ ...EMPTY_SKU }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    // Lista completa (não faceteada pela busca/filtros atuais) de marcas e
    // categorias já existentes — o formulário só permite escolher entre elas.
    filtersService.getFilters({}).then((data) => {
      setOptions({ brands: data.brands, categories: data.categories });
    });
    setError(null);
    setName(product?.name || '');
    setDescription(product?.description || '');
    setBrand(product?.brand || null);
    setCategories(product?.categories || []);
    setImageUrl(product?.images?.[0] || '');
    setAttributeRows(attributesFromProduct(product));
    setSkuRows(skusFromProduct(product));
  }, [open, product]);

  const updateAttributeRow = (index, field, value) => {
    setAttributeRows((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };
  const addAttributeRow = () => setAttributeRows((rows) => [...rows, { ...EMPTY_ATTRIBUTE }]);
  const removeAttributeRow = (index) => setAttributeRows((rows) => rows.filter((_, i) => i !== index));

  const updateSkuRow = (index, field, value) => {
    setSkuRows((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };
  const addSkuRow = () => setSkuRows((rows) => [...rows, { ...EMPTY_SKU }]);
  const removeSkuRow = (index) => setSkuRows((rows) => rows.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    setError(null);

    if (!name.trim() || !description.trim() || !brand || categories.length === 0) {
      setError('Preencha nome, descrição, marca e ao menos 1 categoria.');
      return;
    }
    const validSkus = skuRows.filter((s) => s.sku.trim() && s.color.trim() && s.price !== '' && s.inventory !== '');
    if (validSkus.length === 0) {
      setError('Adicione ao menos 1 SKU válido (código, cor, preço e estoque).');
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      brand: { id: brand.id, name: brand.name },
      categories: categories.map((c) => ({ id: c.id, name: c.name })),
      attributes: Object.fromEntries(attributeRows.filter((r) => r.key.trim()).map((r) => [r.key.trim(), r.value])),
      imageUrl: imageUrl.trim() || undefined,
      skus: validSkus.map((s) => ({
        sku: s.sku.trim(),
        color: s.color.trim(),
        size: s.size.trim() || undefined,
        price: Number(s.price),
        inventory: Number(s.inventory),
        gtin: s.gtin,
      })),
    };

    setSaving(true);
    try {
      const saved = isEdit ? await productsService.update(product._id, payload) : await productsService.create(payload);
      showToast(isEdit ? 'Produto atualizado com sucesso.' : 'Produto cadastrado com sucesso.');
      onSaved(saved);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar produto.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontFamily: '"Playfair Display", serif', fontSize: 24, fontWeight: 600, pt: '28px', px: '32px' }}>
        {isEdit ? 'Editar produto' : 'Cadastrar novo produto'}
      </DialogTitle>
      <DialogContent dividers sx={{ px: '32px', py: '20px' }}>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField label="Nome" value={name} onChange={(e) => setName(e.target.value)} required fullWidth size="small" />
          <TextField
            label="Descrição"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            fullWidth
            multiline
            minRows={2}
            size="small"
          />

          <Autocomplete
            options={options.brands}
            getOptionLabel={(o) => o.name || ''}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            value={brand}
            onChange={(_, value) => setBrand(value)}
            renderInput={(params) => <TextField {...params} label="Marca" required size="small" />}
          />

          <Autocomplete
            multiple
            options={options.categories}
            getOptionLabel={(o) => o.name || ''}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            value={categories}
            onChange={(_, value) => setCategories(value)}
            renderInput={(params) => <TextField {...params} label="Categorias" required size="small" />}
          />

          <TextField
            label="URL da imagem"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            fullWidth
            size="small"
            placeholder="https://..."
          />

          <Divider />
          <Typography variant="subtitle2">Atributos livres</Typography>
          {attributeRows.map((row, i) => (
            <Stack direction="row" spacing={1} key={i} alignItems="center">
              <TextField
                label="Chave"
                value={row.key}
                onChange={(e) => updateAttributeRow(i, 'key', e.target.value)}
                size="small"
                sx={{ flex: 1 }}
              />
              <TextField
                label="Valor"
                value={row.value}
                onChange={(e) => updateAttributeRow(i, 'value', e.target.value)}
                size="small"
                sx={{ flex: 1 }}
              />
              <IconButton size="small" onClick={() => removeAttributeRow(i)} aria-label="Remover atributo">
                <TrashIcon fill="currentColor" />
              </IconButton>
            </Stack>
          ))}
          <Button size="small" startIcon={<PlusIcon fill="currentColor" />} onClick={addAttributeRow} sx={{ alignSelf: 'flex-start' }}>
            Adicionar atributo
          </Button>

          <Divider />
          <Typography variant="subtitle2">SKUs</Typography>
          {skuRows.map((row, i) => (
            <Stack direction="row" spacing={1} key={i} alignItems="center">
              <TextField label="SKU" value={row.sku} onChange={(e) => updateSkuRow(i, 'sku', e.target.value)} size="small" sx={{ flex: 1.2 }} />
              <TextField label="Cor" value={row.color} onChange={(e) => updateSkuRow(i, 'color', e.target.value)} size="small" sx={{ flex: 1 }} />
              <TextField label="Tamanho" value={row.size} onChange={(e) => updateSkuRow(i, 'size', e.target.value)} size="small" sx={{ flex: 0.7 }} />
              <TextField
                label="Preço"
                type="number"
                value={row.price}
                onChange={(e) => updateSkuRow(i, 'price', e.target.value)}
                size="small"
                sx={{ flex: 0.8 }}
              />
              <TextField
                label="Estoque"
                type="number"
                value={row.inventory}
                onChange={(e) => updateSkuRow(i, 'inventory', e.target.value)}
                size="small"
                sx={{ flex: 0.8 }}
              />
              {!row.existing && (
                <IconButton size="small" onClick={() => removeSkuRow(i)} aria-label="Remover SKU">
                  <TrashIcon fill="currentColor" />
                </IconButton>
              )}
            </Stack>
          ))}
          <Button size="small" startIcon={<PlusIcon fill="currentColor" />} onClick={addSkuRow} sx={{ alignSelf: 'flex-start' }}>
            Adicionar SKU
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: '32px', py: '20px', gap: '12px' }}>
        <Button onClick={onClose} disabled={saving} variant="outlined">
          Cancelar
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving} startIcon={saving ? <CircularProgress size={16} /> : null}>
          {isEdit ? 'Salvar alterações' : 'Cadastrar produto'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
