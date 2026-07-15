import { ObjectId } from 'mongodb';
import * as productsRepository from '../repositories/productsRepository.js';
import * as ordersRepository from '../repositories/ordersRepository.js';

export async function createOrder({ productId, sku, quantity = 1 }) {
  if (!productId || !sku) {
    throw Object.assign(new Error('productId e sku são obrigatórios'), { status: 400 });
  }
  if (!ObjectId.isValid(productId)) {
    throw Object.assign(new Error('productId inválido'), { status: 400 });
  }

  const objectId = new ObjectId(productId);
  const product = await productsRepository.findById(objectId);
  if (!product) {
    throw Object.assign(new Error('Produto não encontrado'), { status: 404 });
  }
  const matchedSku = product.skus?.find((s) => s.sku === sku);
  if (!matchedSku) {
    throw Object.assign(new Error('SKU não encontrado'), { status: 404 });
  }

  // Revalida e decrementa o estoque atomicamente no momento da escrita (não
  // confia apenas no bloqueio do botão no frontend) — SPEC_V2 2.6.
  const decremented = await productsRepository.decrementInventory({ productId: objectId, sku, quantity });
  if (!decremented) {
    throw Object.assign(new Error('Produto sem estoque disponível'), { status: 409 });
  }

  return ordersRepository.insertOrder({
    productId: objectId,
    sku,
    productName: product.name,
    price: matchedSku.price,
    quantity,
    createdAt: new Date(),
    status: 'simulated',
  });
}
