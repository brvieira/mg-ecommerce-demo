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

  try {
    console.log('Clearing existing products...');
    await collection.deleteMany({});

    console.log(`Inserting ${products.length} products...`);
    await collection.insertMany(products);

    const indexResults = await createIndexes(collection);
    const readyToPoll = Object.entries(indexResults)
      .filter(([, status]) => status === 'creating')
      .map(([name]) => name);
    if (readyToPoll.length) {
      console.log('Waiting for Atlas Search/Vector Search indexes to become queryable...');
      await pollUntilQueryable(collection, readyToPoll);
    }

    console.log(`Done. Inserted ${products.length} products into "${db.databaseName}.products".`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
