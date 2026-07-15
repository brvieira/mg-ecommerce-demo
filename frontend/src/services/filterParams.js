export function toQueryParams({ filters, page, limit } = {}) {
  const params = {};
  if (page != null) params.page = page;
  if (limit != null) params.limit = limit;
  if (filters?.categoryIds?.length) params.category = filters.categoryIds.join(',');
  if (filters?.brandIds?.length) params.brand = filters.brandIds.join(',');
  if (filters?.colors?.length) params.color = filters.colors.join(',');
  if (filters?.priceMin != null) params.priceMin = filters.priceMin;
  if (filters?.priceMax != null) params.priceMax = filters.priceMax;
  return params;
}
