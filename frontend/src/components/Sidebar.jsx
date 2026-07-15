import { Box, Typography, FormGroup, FormControlLabel, Checkbox, Button } from '@mui/material';
import { useCatalog } from '../context/CatalogContext';
import { tokens } from '../theme/theme';

function toggleValue(list = [], value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function FilterLabel({ children, action }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '12px' }}>
      <Typography variant="overline">{children}</Typography>
      {action}
    </Box>
  );
}

export default function Sidebar() {
  const { filters, setFilters, resetFilters, filterOptions } = useCatalog();

  if (!filterOptions) return null;

  const { brands, categories, colors, priceRange } = filterOptions;
  const priceMin = filters.priceMin ?? priceRange.min;
  const priceMax = filters.priceMax ?? priceRange.max;

  return (
    <Box component="aside" sx={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <FilterLabel
        action={
          <Button size="small" variant="text" onClick={resetFilters} sx={{ padding: '2px 6px', fontSize: 12, minWidth: 0 }}>
            Limpar
          </Button>
        }
      >
        Filtros
      </FilterLabel>

      <Box>
        <Typography variant="overline" sx={{ display: 'block', mb: '12px' }}>
          Categoria
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {categories.map((category) => {
            const active = filters.categoryIds.includes(category.id);
            return (
              <Box
                key={category.id}
                component="button"
                type="button"
                onClick={() => setFilters((f) => ({ ...f, categoryIds: toggleValue(f.categoryIds, category.id) }))}
                sx={{
                  border: '1px solid',
                  borderColor: active ? tokens.accent : tokens.borderChip,
                  backgroundColor: active ? tokens.accentBg : 'transparent',
                  color: active ? tokens.accentFg : tokens.inkSecondary,
                  padding: '7px 14px',
                  borderRadius: '999px',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                {category.name} ({category.count})
              </Box>
            );
          })}
        </Box>
      </Box>

      <Box>
        <Typography variant="overline" sx={{ display: 'block', mb: '12px' }}>
          Faixa de preço (R$)
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Box
            component="input"
            type="number"
            value={priceMin}
            onChange={(e) => setFilters((f) => ({ ...f, priceMin: e.target.value === '' ? undefined : Number(e.target.value) }))}
            sx={{
              width: 90,
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: tokens.borderStrong,
              backgroundColor: tokens.surface,
              fontSize: 13,
              fontFamily: 'inherit',
              color: tokens.ink,
            }}
          />
          <Typography sx={{ color: tokens.muted }}>–</Typography>
          <Box
            component="input"
            type="number"
            value={priceMax}
            onChange={(e) => setFilters((f) => ({ ...f, priceMax: e.target.value === '' ? undefined : Number(e.target.value) }))}
            sx={{
              width: 90,
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: tokens.borderStrong,
              backgroundColor: tokens.surface,
              fontSize: 13,
              fontFamily: 'inherit',
              color: tokens.ink,
            }}
          />
        </Box>
      </Box>

      <Box>
        <Typography variant="overline" sx={{ display: 'block', mb: '12px' }}>
          Marca
        </Typography>
        <FormGroup sx={{ maxHeight: 220, overflowY: 'auto' }}>
          {brands.map((brand) => (
            <FormControlLabel
              key={brand.id}
              sx={{ '& .MuiFormControlLabel-label': { fontSize: 13.5, color: tokens.inkSecondary } }}
              control={
                <Checkbox
                  size="small"
                  checked={filters.brandIds.includes(brand.id)}
                  onChange={() => setFilters((f) => ({ ...f, brandIds: toggleValue(f.brandIds, brand.id) }))}
                />
              }
              label={`${brand.name} (${brand.count})`}
            />
          ))}
        </FormGroup>
      </Box>

      <Box>
        <Typography variant="overline" sx={{ display: 'block', mb: '12px' }}>
          Cor
        </Typography>
        <FormGroup sx={{ maxHeight: 220, overflowY: 'auto' }}>
          {colors.map((color) => (
            <FormControlLabel
              key={color.value}
              sx={{ '& .MuiFormControlLabel-label': { fontSize: 13.5, color: tokens.inkSecondary } }}
              control={
                <Checkbox
                  size="small"
                  checked={filters.colors.includes(color.value)}
                  onChange={() => setFilters((f) => ({ ...f, colors: toggleValue(f.colors, color.value) }))}
                />
              }
              label={`${color.value} (${color.count})`}
            />
          ))}
        </FormGroup>
      </Box>
    </Box>
  );
}
