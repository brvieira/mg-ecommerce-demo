import api from './api';
import { toQueryParams } from './filterParams';

export async function getFilters({ q, filters } = {}) {
  const params = toQueryParams({ filters });
  if (q) params.q = q;
  const { data } = await api.get('/filters', { params });
  return data;
}
