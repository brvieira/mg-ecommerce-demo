import * as productService from '../services/productService.js';
import { parsePagination, parseFilters } from './queryHelpers.js';

export async function list(req, res, next) {
  try {
    const { page, limit } = parsePagination(req.query);
    const filters = parseFilters(req.query);
    const result = await productService.listProducts({ page, limit, filters });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const product = await productService.getProductById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const product = await productService.createProduct(req.body);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
}

export async function getSimilar(req, res, next) {
  try {
    const items = await productService.findSimilarProducts(req.params.id);
    res.json({ items });
  } catch (err) {
    next(err);
  }
}
