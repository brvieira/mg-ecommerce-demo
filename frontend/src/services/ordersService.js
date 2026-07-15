import api from './api';

export async function createOrder({ productId, sku, quantity = 1 }) {
  const { data } = await api.post('/orders', { productId, sku, quantity });
  return data;
}
