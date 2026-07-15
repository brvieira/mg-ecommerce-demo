import { getProductsCollection } from '../config/db.js';
import { SEARCH_INDEX_NAME, VECTOR_INDEX_NAME } from '../config/searchIndexes.js';

const PROJECT_OUT_EMBEDDING = { embedding: 0 };
const PRICE_FROM_FIELD = { priceFrom: { $min: '$skus.price' } };

function buildMqlMatch({ categoryIds, brandIds, colors, priceMin, priceMax } = {}) {
  const clauses = [];
  if (categoryIds?.length) clauses.push({ 'categories.id': { $in: categoryIds } });
  if (brandIds?.length) clauses.push({ 'brand.id': { $in: brandIds } });
  if (colors?.length) clauses.push({ 'skus.color': { $in: colors } });
  if (priceMin != null || priceMax != null) {
    const range = {};
    if (priceMin != null) range.$gte = priceMin;
    if (priceMax != null) range.$lte = priceMax;
    clauses.push({ 'skus.price': range });
  }
  return clauses.length ? { $and: clauses } : {};
}

// Facetas de multi-seleção clássicas de e-commerce: a contagem de cada dimensão
// ignora o próprio filtro ativo daquela dimensão, mas respeita as demais (ver
// docs/DIVERGENCES.md, item 10).
function buildMqlMatchExcluding(filters, excludeKey) {
  const clone = { ...filters };
  if (excludeKey === 'categoryIds') clone.categoryIds = undefined;
  if (excludeKey === 'brandIds') clone.brandIds = undefined;
  if (excludeKey === 'colors') clone.colors = undefined;
  if (excludeKey === 'price') {
    clone.priceMin = undefined;
    clone.priceMax = undefined;
  }
  return buildMqlMatch(clone);
}

function buildSearchFilterClauses({ categoryIds, brandIds, colors, priceMin, priceMax } = {}) {
  const clauses = [];
  if (categoryIds?.length) clauses.push({ in: { path: 'categories.id', value: categoryIds } });
  if (brandIds?.length) clauses.push({ in: { path: 'brand.id', value: brandIds } });
  if (colors?.length) clauses.push({ in: { path: 'skus.color', value: colors } });
  if (priceMin != null || priceMax != null) {
    const range = { path: 'skus.price' };
    if (priceMin != null) range.gte = priceMin;
    if (priceMax != null) range.lte = priceMax;
    clauses.push({ range });
  }
  return clauses;
}

export async function findPaginated({ filters, skip, limit }) {
  const collection = getProductsCollection();
  const match = buildMqlMatch(filters);
  const [items, total] = await Promise.all([
    collection
      .aggregate([
        { $match: match },
        { $addFields: PRICE_FROM_FIELD },
        { $sort: { _id: 1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: PROJECT_OUT_EMBEDDING },
      ])
      .toArray(),
    collection.countDocuments(match),
  ]);
  return { items, total };
}

// includeEmbedding: usado por GET /products/:id (o Painel de Debug da v2 exige o
// campo `embedding` bruto) e pelo fluxo de escrita (criar/editar precisa do
// documento completo para merge, e a geração de "produtos semelhantes" precisa
// do vetor). Listagem e busca continuam sempre excluindo o campo (payload leve).
export async function findById(id, { includeEmbedding = false } = {}) {
  const collection = getProductsCollection();
  const pipeline = [{ $match: { _id: id } }, { $addFields: PRICE_FROM_FIELD }];
  if (!includeEmbedding) pipeline.push({ $project: PROJECT_OUT_EMBEDDING });
  const [product] = await collection.aggregate(pipeline).toArray();
  return product || null;
}

export async function insertProduct(doc) {
  const collection = getProductsCollection();
  const { insertedId } = await collection.insertOne(doc);
  return findById(insertedId, { includeEmbedding: true });
}

export async function updateProduct(id, update) {
  const collection = getProductsCollection();
  await collection.updateOne({ _id: id }, { $set: update });
  return findById(id, { includeEmbedding: true });
}

export async function decrementInventory({ productId, sku, quantity }) {
  const collection = getProductsCollection();
  const result = await collection.updateOne(
    { _id: productId, skus: { $elemMatch: { sku, inventory: { $gte: quantity } } } },
    { $inc: { 'skus.$.inventory': -quantity } },
  );
  return result.modifiedCount === 1;
}

export async function searchText({ q, filters, skip, limit }) {
  const collection = getProductsCollection();
  const compound = {
    must: [{ text: { query: q, path: ['name', 'description', 'brand.name', 'categories.name'] } }],
    filter: buildSearchFilterClauses(filters),
  };

  const [items, [metaResult]] = await Promise.all([
    collection
      .aggregate([
        { $search: { index: SEARCH_INDEX_NAME, compound } },
        { $addFields: { score: { $meta: 'searchScore' }, ...PRICE_FROM_FIELD } },
        { $skip: skip },
        { $limit: limit },
        { $project: PROJECT_OUT_EMBEDDING },
      ])
      .toArray(),
    collection
      .aggregate([
        { $searchMeta: { index: SEARCH_INDEX_NAME, compound, count: { type: 'lowerBound', threshold: 1000 } } },
      ])
      .toArray(),
  ]);

  return { items, total: metaResult?.count?.lowerBound ?? items.length };
}

// Caminho de Vector Search dedicado a "produtos semelhantes" (SPEC_V2 2.3): busca
// pelo embedding do próprio produto, sem filtros de categoria/marca/cor/preço e
// sem RRF. Como o filtro nativo do $vectorSearch exigiria indexar `_id` como campo
// filtrável, em vez disso buscamos um candidato a mais e removemos o próprio
// produto do resultado em memória — mais simples e robusto para o tamanho deste
// catálogo de demo.
export async function findSimilar({ id, embedding, limit }) {
  const collection = getProductsCollection();
  const fetchLimit = limit + 1;
  const candidates = await collection
    .aggregate([
      {
        $vectorSearch: {
          index: VECTOR_INDEX_NAME,
          path: 'embedding',
          queryVector: embedding,
          numCandidates: Math.max(fetchLimit * 10, 100),
          limit: fetchLimit,
        },
      },
      { $addFields: { score: { $meta: 'vectorSearchScore' }, ...PRICE_FROM_FIELD } },
      { $project: PROJECT_OUT_EMBEDDING },
    ])
    .toArray();

  return candidates.filter((item) => !item._id.equals(id)).slice(0, limit);
}

export async function getFiltersFacets({ q, filters } = {}) {
  const collection = getProductsCollection();
  const pipeline = [];

  if (q && q.trim()) {
    pipeline.push({
      $search: { index: SEARCH_INDEX_NAME, text: { query: q, path: ['name', 'description', 'brand.name', 'categories.name'] } },
    });
  }

  pipeline.push({
    $facet: {
      categories: [
        { $match: buildMqlMatchExcluding(filters, 'categoryIds') },
        { $unwind: '$categories' },
        { $group: { _id: '$categories.id', name: { $first: '$categories.name' }, count: { $sum: 1 } } },
        { $sort: { name: 1 } },
      ],
      brands: [
        { $match: buildMqlMatchExcluding(filters, 'brandIds') },
        { $group: { _id: '$brand.id', name: { $first: '$brand.name' }, count: { $sum: 1 } } },
        { $sort: { name: 1 } },
      ],
      colors: [
        { $match: buildMqlMatchExcluding(filters, 'colors') },
        { $unwind: '$skus' },
        { $group: { _id: { color: '$skus.color', productId: '$_id' } } },
        { $group: { _id: '$_id.color', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ],
      priceRange: [
        { $match: buildMqlMatchExcluding(filters, 'price') },
        { $unwind: '$skus' },
        { $group: { _id: null, min: { $min: '$skus.price' }, max: { $max: '$skus.price' } } },
      ],
    },
  });

  const [result] = await collection.aggregate(pipeline).toArray();
  return result;
}
