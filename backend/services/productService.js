import { ObjectId } from 'mongodb';
import * as productsRepository from '../repositories/productsRepository.js';
import { embedTexts } from './embeddingService.js';

const SIMILAR_LIMIT = 4;

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function embeddingInputFor(product) {
  const categoryNames = product.categories.map((c) => c.name).join(', ');
  return [
    product.name,
    product.description,
    product.brand.name,
    categoryNames,
  ].join('\n');
}

// SPEC_V2 2.1/2.2: se a chamada ao provedor de embeddings falhar, a escrita
// inteira é bloqueada (ver docs/DIVERGENCES.md, item 8) — evita produtos sem
// `embedding` no catálogo.
async function generateEmbedding(product) {
  try {
    const [embedding] = await embedTexts([embeddingInputFor(product)]);
    return embedding;
  } catch (err) {
    throw Object.assign(
      new Error(`Falha ao gerar embedding do produto: ${err.message}`),
      { status: 502 },
    );
  }
}

function validateSkus(skus) {
  if (!Array.isArray(skus) || skus.length === 0) {
    throw badRequest(
      'ao menos 1 SKU é obrigatório (sku, color, price, inventory)',
    );
  }
  for (const sku of skus) {
    if (!sku.sku || !sku.color || sku.price == null || sku.inventory == null) {
      throw badRequest('cada SKU precisa de sku, color, price e inventory');
    }
  }
}

// SPEC_V2 2.1: marca/categoria são selecionadas a partir dos valores já
// existentes no catálogo (ver docs/DIVERGENCES.md, item 9) — evita duplicidade
// e mantém os facets/índices Atlas Search consistentes.
async function assertKnownBrandAndCategories({ brand, categories }) {
  const { brands, categories: knownCategories } =
    await productsRepository.getFiltersFacets({});
  const knownBrandIds = new Set(brands.map((b) => b._id));
  const knownCategoryIds = new Set(knownCategories.map((c) => c._id));

  if (!brand?.id || !knownBrandIds.has(brand.id)) {
    throw badRequest(`Marca desconhecida: ${brand?.id}`);
  }
  for (const category of categories) {
    if (!category?.id || !knownCategoryIds.has(category.id)) {
      throw badRequest(`Categoria desconhecida: ${category?.id}`);
    }
  }
}

export async function listProducts({ page, limit, filters }) {
  const skip = (page - 1) * limit;
  const { items, total } = await productsRepository.findPaginated({
    filters,
    skip,
    limit,
  });
  return { items, total, page, limit };
}

export async function getProductById(id) {
  if (!ObjectId.isValid(id)) return null;
  // includeEmbedding: o Painel de Debug (SPEC_V2 2.4) exibe o JSON bruto do
  // produto, incluindo o vetor de embedding, reaproveitando esta mesma resposta.
  return productsRepository.findById(new ObjectId(id), {
    includeEmbedding: true,
  });
}

export async function createProduct(input) {
  const { name, description, brand, categories, skus, attributes, imageUrl } =
    input;

  if (!name?.trim()) throw badRequest('name é obrigatório');
  if (!description?.trim()) throw badRequest('description é obrigatório');
  if (!Array.isArray(categories) || categories.length === 0)
    throw badRequest('ao menos 1 categoria é obrigatória');
  validateSkus(skus);
  await assertKnownBrandAndCategories({ brand, categories });

  const images = imageUrl ? [imageUrl] : [];
  const doc = {
    name: name.trim(),
    description: description.trim(),
    brand,
    categories,
    attributes: attributes || {},
    images,
    skus: skus.map((sku) => ({ ...sku, images })),
    createdAt: new Date(),
  };

  doc.embedding = await generateEmbedding(doc);

  return productsRepository.insertProduct(doc);
}

export async function updateProduct(id, input) {
  if (!ObjectId.isValid(id)) return null;
  const objectId = new ObjectId(id);
  const existing = await productsRepository.findById(objectId, {
    includeEmbedding: true,
  });
  if (!existing) return null;

  const { name, description, brand, categories, attributes, skus, imageUrl } =
    input;

  if (brand !== undefined || categories !== undefined) {
    await assertKnownBrandAndCategories({
      brand: brand !== undefined ? brand : existing.brand,
      categories: categories !== undefined ? categories : existing.categories,
    });
  }
  if (skus !== undefined) validateSkus(skus);

  const update = {};
  if (name !== undefined) update.name = name.trim();
  if (description !== undefined) update.description = description.trim();
  if (brand !== undefined) update.brand = brand;
  if (categories !== undefined) update.categories = categories;
  if (attributes !== undefined) update.attributes = attributes;
  if (imageUrl !== undefined) update.images = [imageUrl];

  if (skus !== undefined) {
    const images = update.images || existing.images;
    update.skus = skus.map((sku) => ({ ...sku, images }));
  } else if (update.images) {
    // Imagem trocada mas SKUs não reenviados: propaga a nova imagem para os SKUs existentes.
    update.skus = existing.skus.map((sku) => ({
      ...sku,
      images: update.images,
    }));
  }

  const nameChanged =
    update.name !== undefined && update.name !== existing.name;
  const descriptionChanged =
    update.description !== undefined &&
    update.description !== existing.description;
  if (nameChanged || descriptionChanged) {
    update.embedding = await generateEmbedding({ ...existing, ...update });
  }

  return productsRepository.updateProduct(objectId, update);
}

export async function findSimilarProducts(id) {
  if (!ObjectId.isValid(id)) return [];
  const objectId = new ObjectId(id);
  const product = await productsRepository.findById(objectId, {
    includeEmbedding: true,
  });
  if (!product?.embedding) return [];

  const items = await productsRepository.findSimilar({
    id: objectId,
    embedding: product.embedding,
    limit: SIMILAR_LIMIT,
  });
  return items.map((item) => ({ ...item, vectorScore: item.score }));
}
