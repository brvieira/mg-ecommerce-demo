export function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(48, Math.max(1, parseInt(query.limit, 10) || 12));
  return { page, limit };
}

function parseCsv(value) {
  if (!value) return undefined;
  return String(value)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

export function parseFilters(query) {
  return {
    categoryIds: parseCsv(query.category),
    brandIds: parseCsv(query.brand),
    colors: parseCsv(query.color),
    priceMin: query.priceMin != null ? Number(query.priceMin) : undefined,
    priceMax: query.priceMax != null ? Number(query.priceMax) : undefined,
  };
}
