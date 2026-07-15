import * as orderService from '../services/orderService.js';

export async function create(req, res, next) {
  try {
    const { productId, sku, quantity } = req.body;
    const order = await orderService.createOrder({ productId, sku, quantity: quantity || 1 });
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
}
