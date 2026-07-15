import { OPENAI_EMBEDDING_DIMENSIONS } from './openai.js';

export const SEARCH_INDEX_NAME = 'product_search_index';
export const VECTOR_INDEX_NAME = 'product_vector_index';

export const SEARCH_INDEX_DEFINITION = {
  name: SEARCH_INDEX_NAME,
  type: 'search',
  definition: {
    mappings: {
      dynamic: false,
      fields: {
        name: { type: 'string' },
        description: { type: 'string' },
        brand: {
          type: 'document',
          fields: {
            name: { type: 'string' },
            id: { type: 'token' },
          },
        },
        categories: {
          type: 'document',
          fields: {
            name: { type: 'string' },
            id: { type: 'token' },
          },
        },
        skus: {
          type: 'document',
          fields: {
            color: { type: 'token' },
            price: { type: 'number' },
          },
        },
      },
    },
  },
};

export const VECTOR_INDEX_DEFINITION = {
  name: VECTOR_INDEX_NAME,
  type: 'vectorSearch',
  definition: {
    fields: [
      {
        type: 'vector',
        path: 'embedding',
        numDimensions: OPENAI_EMBEDDING_DIMENSIONS,
        similarity: 'cosine',
      },
      { type: 'filter', path: 'brand.id' },
      { type: 'filter', path: 'categories.id' },
      { type: 'filter', path: 'skus.color' },
      { type: 'filter', path: 'skus.price' },
    ],
  },
};

export const COMMON_MQL_INDEXES = [
  { key: { 'brand.id': 1 } },
  { key: { 'categories.id': 1 } },
  { key: { 'skus.color': 1 } },
  { key: { 'skus.price': 1 } },
];
