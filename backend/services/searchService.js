import * as productsRepository from '../repositories/productsRepository.js';

function withTiming(fn) {
  return async (...args) => {
    const start = Date.now();
    const result = await fn(...args);
    return { ...result, tookMs: Date.now() - start };
  };
}

// v2: a barra de busca principal usa exclusivamente Atlas Search (ver SPEC_V2.md
// 2.0). Vector Search e a fusão híbrida por RRF da v1 foram removidas daqui —
// Vector Search agora só existe em productService.findSimilarProducts (ver
// docs/DIVERGENCES.md, item 11).
export const search = withTiming(async ({ q, filters, page, limit }) => {
  const skip = (page - 1) * limit;
  const { items, total } = await productsRepository.searchText({ q, filters, skip, limit });
  return {
    total,
    page,
    limit,
    items: items.map((item) => ({ ...item, textScore: item.score })),
  };
});
