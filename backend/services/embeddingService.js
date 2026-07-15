import { OPENAI_API_KEY, OPENAI_EMBEDDING_MODEL, OPENAI_EMBEDDINGS_URL } from '../config/openai.js';

async function requestEmbeddings(input) {
  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: OPENAI_EMBEDDING_MODEL, input }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI embeddings request failed (${response.status}): ${errorBody}`);
  }

  const { data } = await response.json();
  return data.sort((a, b) => a.index - b.index).map((item) => item.embedding);
}

export async function embedTexts(texts) {
  return requestEmbeddings(texts);
}

export async function embedQuery(text) {
  const [embedding] = await requestEmbeddings([text]);
  return embedding;
}
