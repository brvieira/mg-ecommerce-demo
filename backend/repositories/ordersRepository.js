import { getDb } from '../config/db.js';

export function getOrdersCollection() {
  return getDb().collection('orders');
}

export async function insertOrder(order) {
  const collection = getOrdersCollection();
  const { insertedId } = await collection.insertOne(order);
  return { ...order, _id: insertedId };
}
