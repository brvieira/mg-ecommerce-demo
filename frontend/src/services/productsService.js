import api from './api';
import { toQueryParams } from './filterParams';

export async function list({ filters, page = 1, limit = 12 }) {
  const { data } = await api.get('/products', { params: toQueryParams({ filters, page, limit }) });
  return data;
}

export async function getById(id) {
  const { data } = await api.get(`/products/${id}`);
  return data;
}

export async function create(product) {
  const { data } = await api.post('/products', product);
  return data;
}

export async function update(id, product) {
  const { data } = await api.put(`/products/${id}`, product);
  return data;
}

export async function getSimilar(id) {
  const { data } = await api.get(`/products/${id}/similar`);
  return data.items;
}
