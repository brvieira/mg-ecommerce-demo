export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const OPENAI_EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
export const OPENAI_EMBEDDING_DIMENSIONS = Number(process.env.OPENAI_EMBEDDING_DIMENSIONS || 1536);
export const OPENAI_EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings';
