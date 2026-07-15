import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { MongoClient } from 'mongodb';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import dinâmico: garante que as variáveis de ambiente já estejam carregadas
// antes de backend/config/openai.js ler process.env em nível de módulo.
const { embedTexts } = await import('../backend/services/embeddingService.js');
const {
  SEARCH_INDEX_DEFINITION,
  VECTOR_INDEX_DEFINITION,
  COMMON_MQL_INDEXES,
  SEARCH_INDEX_NAME,
  VECTOR_INDEX_NAME,
} = await import('../backend/config/searchIndexes.js');

const BATCH_SIZE = 100;
const INDEX_POLL_INTERVAL_MS = 5000;
const INDEX_POLL_TIMEOUT_MS = 180000;

const ORDERS_COUNT = 20000;
const ORDERS_HISTORY_DAYS = 90;
const ORDERS_INSERT_BATCH_SIZE = 2000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Mais pedidos à noite/fim de tarde do que de madrugada - um padrão típico de
// e-commerce (pico de navegação fora do horário comercial).
const HOUR_WEIGHTS = [
  0.2, 0.1, 0.1, 0.1, 0.1, 0.2, // 0h-5h
  0.4, 0.6, 0.8, 1.0, 1.1, 1.2, // 6h-11h
  1.3, 1.3, 1.2, 1.2, 1.3, 1.4, // 12h-17h
  1.6, 1.8, 1.9, 1.7, 1.3, 0.8, // 18h-23h
];

// Boost por dia da semana, indexado por Date#getDay() (0 = domingo ... 6 = sábado).
const WEEKDAY_BOOST = [1.3, 1.0, 1.0, 1.0, 1.05, 1.2, 1.5];

function loadJson(relativePath) {
  return JSON.parse(readFileSync(path.resolve(__dirname, relativePath), 'utf-8'));
}

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
}

function embeddingInputFor(product) {
  const categoryNames = product.categories.map((c) => c.name).join(', ');
  return [product.name, product.description, product.brand.name, categoryNames].join('\n');
}

async function embedWithRetry(texts, attempt = 1) {
  try {
    return await embedTexts(texts);
  } catch (err) {
    const isRateLimited = err.message.includes('429');
    if (isRateLimited && attempt <= 5) {
      const backoffMs = attempt * 2000;
      console.warn(`Rate limited by OpenAI, retrying in ${backoffMs}ms (attempt ${attempt})...`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      return embedWithRetry(texts, attempt + 1);
    }
    throw err;
  }
}

function resolveImages(imageRefs, images) {
  return imageRefs.map((ref) => {
    const url = images[ref];
    if (!url) throw new Error(`Missing image ref in images.json: ${ref}`);
    return url;
  });
}

async function generateEmbeddings(products) {
  console.log(`Generating embeddings for ${products.length} products via OpenAI...`);
  const batches = chunk(products, BATCH_SIZE);
  let processed = 0;
  for (const batch of batches) {
    const inputs = batch.map(embeddingInputFor);
    const embeddings = await embedWithRetry(inputs);
    batch.forEach((product, i) => {
      product.embedding = embeddings[i];
    });
    processed += batch.length;
    console.log(`  ${processed}/${products.length} embeddings generated`);
  }
}

function buildCumulativeWeights(weights) {
  const cumulative = [];
  let sum = 0;
  for (const weight of weights) {
    sum += weight;
    cumulative.push(sum);
  }
  return cumulative;
}

// Escolhe um índice sorteando proporcionalmente aos pesos acumulados. Varredura
// linear é suficiente aqui: os maiores arrays envolvidos (produtos, dias do
// histórico) têm no máximo algumas centenas de posições.
function pickWeightedIndex(cumulativeWeights) {
  const roll = Math.random() * cumulativeWeights[cumulativeWeights.length - 1];
  for (let i = 0; i < cumulativeWeights.length; i++) {
    if (roll <= cumulativeWeights[i]) return i;
  }
  return cumulativeWeights.length - 1;
}

// Distribuição long-tail (tipo Pareto): poucos produtos concentram a maior
// parte das vendas, como em um catálogo real, em vez de vendas uniformes entre
// os 100 produtos.
function buildProductWeights(products) {
  return products.map(() => Math.random() ** 2.5);
}

// Pondera os SKUs de um produto por estoque cadastrado (proxy de quão "popular"
// aquela variante costuma ser/é reposta) com um fator aleatório fixo por SKU,
// calculado uma única vez para que a mesma variante seja consistentemente mais
// ou menos vendida ao longo de todo o histórico gerado.
function buildSkuWeights(product) {
  const weights = product.skus.map((sku) => (sku.inventory + 1) * (0.4 + Math.random() * 1.2));
  return buildCumulativeWeights(weights);
}

// Peso por dia dentro da janela do histórico: sazonalidade de fim de semana,
// leve tendência de crescimento até a data mais recente, ruído dia-a-dia e
// alguns "dias de pico" (promoções pontuais) - produz uma curva de vendas com
// variação natural em vez de uma média constante por dia.
function buildDayWeights(days) {
  const weights = [];
  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    const date = new Date(Date.now() - (days - 1 - dayOffset) * MS_PER_DAY);
    const weekdayBoost = WEEKDAY_BOOST[date.getDay()];
    const growthTrend = 0.8 + (0.4 * dayOffset) / (days - 1);
    const noise = 0.7 + Math.random() * 0.6;
    weights.push(weekdayBoost * growthTrend * noise);
  }

  const spikeDayCount = Math.round(days * 0.04);
  const spikeDays = new Set();
  while (spikeDays.size < spikeDayCount) {
    spikeDays.add(Math.floor(Math.random() * days));
  }
  for (const dayOffset of spikeDays) {
    weights[dayOffset] *= 2.5 + Math.random() * 1.5;
  }

  return weights;
}

function randomQuantity() {
  const roll = Math.random();
  if (roll < 0.72) return 1;
  if (roll < 0.9) return 2;
  if (roll < 0.97) return 3;
  return 4 + Math.floor(Math.random() * 2);
}

function randomTimestampForDay(dayOffset, days, hourCumulativeWeights) {
  const dayStart = new Date(Date.now() - (days - 1 - dayOffset) * MS_PER_DAY);
  dayStart.setHours(0, 0, 0, 0);
  const hour = pickWeightedIndex(hourCumulativeWeights);
  const minute = Math.floor(Math.random() * 60);
  const second = Math.floor(Math.random() * 60);
  return new Date(dayStart.getTime() + hour * 60 * 60 * 1000 + minute * 60 * 1000 + second * 1000);
}

// Gera pedidos históricos simulados dos últimos ORDERS_HISTORY_DAYS dias,
// distribuídos de forma não-uniforme entre produtos e datas (ver helpers de
// peso acima). Não decrementa o `inventory` real dos produtos: o histórico
// representa vendas passadas, dissociadas do snapshot de estoque atual do
// catálogo (que é o que a simulação de compra ao vivo em POST /orders usa).
function generateHistoricalOrders(products) {
  console.log(`Generating ${ORDERS_COUNT} historical orders across the last ${ORDERS_HISTORY_DAYS} days...`);

  const productCumulativeWeights = buildCumulativeWeights(buildProductWeights(products));
  const dayCumulativeWeights = buildCumulativeWeights(buildDayWeights(ORDERS_HISTORY_DAYS));
  const skuCumulativeWeightsByProduct = products.map(buildSkuWeights);
  const hourCumulativeWeights = buildCumulativeWeights(HOUR_WEIGHTS);

  const orders = [];
  for (let i = 0; i < ORDERS_COUNT; i++) {
    const productIndex = pickWeightedIndex(productCumulativeWeights);
    const product = products[productIndex];
    const skuIndex = pickWeightedIndex(skuCumulativeWeightsByProduct[productIndex]);
    const sku = product.skus[skuIndex];
    const dayOffset = pickWeightedIndex(dayCumulativeWeights);

    orders.push({
      productId: product._id,
      sku: sku.sku,
      productName: product.name,
      price: sku.price,
      quantity: randomQuantity(),
      createdAt: randomTimestampForDay(dayOffset, ORDERS_HISTORY_DAYS, hourCumulativeWeights),
      status: 'simulated',
    });
  }

  return orders;
}

async function createIndexes(collection) {
  console.log('Creating common MQL indexes...');
  await collection.createIndexes(COMMON_MQL_INDEXES);

  const results = {};
  for (const definition of [SEARCH_INDEX_DEFINITION, VECTOR_INDEX_DEFINITION]) {
    try {
      console.log(`Creating Atlas index "${definition.name}" (type: ${definition.type})...`);
      await collection.createSearchIndex(definition);
      results[definition.name] = 'creating';
    } catch (err) {
      console.error(`Failed to create Atlas index "${definition.name}": ${err.message}`);
      console.error('Create it manually via Atlas UI (Search > Create Search Index > JSON Editor) using:');
      console.error(JSON.stringify(definition, null, 2));
      results[definition.name] = 'failed';
    }
  }
  return results;
}

async function pollUntilQueryable(collection, indexNames) {
  const pending = new Set(indexNames);
  const deadline = Date.now() + INDEX_POLL_TIMEOUT_MS;

  while (pending.size > 0 && Date.now() < deadline) {
    const indexes = await collection.listSearchIndexes().toArray();
    for (const name of [...pending]) {
      const found = indexes.find((idx) => idx.name === name);
      if (found?.queryable) {
        console.log(`Index "${name}" is queryable.`);
        pending.delete(name);
      }
    }
    if (pending.size > 0) {
      await new Promise((resolve) => setTimeout(resolve, INDEX_POLL_INTERVAL_MS));
    }
  }

  if (pending.size > 0) {
    console.warn(`Timed out waiting for indexes to become queryable: ${[...pending].join(', ')}`);
    console.warn('They may still be building in the background; check the Atlas UI.');
  }
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set (check your .env file)');
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set (check your .env file)');

  const products = loadJson('./products.json');
  const images = loadJson('./images.json');

  for (const product of products) {
    product.images = resolveImages(product.imageRefs, images);
    delete product.imageRefs;
    for (const sku of product.skus) {
      sku.images = product.images;
    }
    product.createdAt = new Date();
  }

  await generateEmbeddings(products);

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'catalog_demo');
  const collection = db.collection('products');
  const ordersCollection = db.collection('orders');

  try {
    console.log('Clearing existing products...');
    await collection.deleteMany({});

    console.log(`Inserting ${products.length} products...`);
    const { insertedIds } = await collection.insertMany(products);
    products.forEach((product, index) => {
      product._id = insertedIds[index];
    });

    const indexResults = await createIndexes(collection);
    const readyToPoll = Object.entries(indexResults)
      .filter(([, status]) => status === 'creating')
      .map(([name]) => name);
    if (readyToPoll.length) {
      console.log('Waiting for Atlas Search/Vector Search indexes to become queryable...');
      await pollUntilQueryable(collection, readyToPoll);
    }

    console.log('Clearing existing orders...');
    await ordersCollection.deleteMany({});

    const historicalOrders = generateHistoricalOrders(products);
    console.log(`Inserting ${historicalOrders.length} historical orders...`);
    for (const batch of chunk(historicalOrders, ORDERS_INSERT_BATCH_SIZE)) {
      await ordersCollection.insertMany(batch, { ordered: false });
    }

    console.log(`Done. Inserted ${products.length} products into "${db.databaseName}.products".`);
    console.log(`Done. Inserted ${historicalOrders.length} orders into "${db.databaseName}.orders".`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
