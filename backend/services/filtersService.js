import * as productsRepository from '../repositories/productsRepository.js';

export async function getFilters({ q, filters } = {}) {
  const facets = await productsRepository.getFiltersFacets({ q, filters });
  return {
    brands: facets.brands.map((b) => ({ id: b._id, name: b.name, count: b.count })),
    categories: facets.categories.map((c) => ({ id: c._id, name: c.name, count: c.count })),
    colors: facets.colors.map((c) => ({ value: c._id, count: c.count })),
    priceRange: facets.priceRange[0] ? { min: facets.priceRange[0].min, max: facets.priceRange[0].max } : { min: 0, max: 0 },
  };
}
