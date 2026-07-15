import { getProductsCollection } from '../config/db.js';
import { getOrdersCollection } from '../repositories/ordersRepository.js';

const RECONNECT_DELAY_MS = 5000;

function logEvent(collectionName, payload) {
  console.log(
    JSON.stringify(
      { ts: new Date().toISOString(), collection: collectionName, ...payload },
      null,
      2,
    ),
  );
}

// Reconecta automaticamente se o change stream cair (ex.: falha de rede) -
// sem isso, o serviço de log silenciosamente para de emitir eventos até o
// próximo restart do processo.
function watch(collectionName, getCollection, pipeline, onChange) {
  const stream = getCollection().watch(pipeline);

  stream.on('change', onChange);

  stream.on('error', (err) => {
    console.error(
      `[changeLogService] ${collectionName} change stream error:`,
      err.message,
    );
  });

  stream.on('close', () => {
    console.warn(
      `[changeLogService] ${collectionName} change stream closed, reconnecting in ${RECONNECT_DELAY_MS}ms`,
    );
    setTimeout(
      () => watch(collectionName, getCollection, pipeline, onChange),
      RECONNECT_DELAY_MS,
    );
  });

  return stream;
}

function watchOrders() {
  return watch(
    'orders',
    getOrdersCollection,
    [{ $match: { operationType: 'insert' } }],
    (change) => {
      const order = change.fullDocument;
      logEvent('orders', {
        event: 'order_created',
        orderId: order?._id,
        productId: order?.productId,
        sku: order?.sku,
        quantity: order?.quantity,
        price: order?.price,
        status: order?.status,
      });
    },
  );
}

// Loga apenas os nomes dos campos alterados (não os valores) - o documento de
// produto carrega o vetor `embedding` (1536 floats), que poluiria o log se
// fosse serializado inteiro a cada update.
function watchProducts() {
  return watch('products', getProductsCollection, [], (change) => {
    logEvent('products', {
      event: `product_${change.operationType}`,
      productId: change.documentKey?._id,
      updatedFields: change.updateDescription?.updatedFields
        ? Object.keys(change.updateDescription.updatedFields)
        : undefined,
      removedFields: change.updateDescription?.removedFields,
    });
  });
}

export function startChangeLogService() {
  watchOrders();
  //watchProducts();
}
