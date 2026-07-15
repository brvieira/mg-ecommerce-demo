import api from './api';
import { toQueryParams } from './filterParams';

export async function search({ q, filters, page = 1, limit = 12 }) {
  const params = { ...toQueryParams({ filters, page, limit }), q };
  const { data } = await api.get('/search', { params });
  return data;
}
