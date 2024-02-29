import { openai } from '../openai/openaiConfig';

const EMBEDDINGS_API_COST = 0.00002;
const EMBEDDINGS_MODEL = 'text-embedding-3-small';

export async function createEmbeddings(text: string, type?: string) {
  try {
    const embeddings = await openai.embeddings.create({
      model: EMBEDDINGS_MODEL,
      input: text,
      encoding_format: 'float',
    });

    const totalTokens = embeddings?.usage.total_tokens;
    // 	$0.00002 / 1K tokens
    const cost = EMBEDDINGS_API_COST * (totalTokens / 1000);

    console.log(`Embeddings cost for ${type}" ${cost}`);

    return embeddings;
  } catch (error) {
    console.error('Failed to create embeddings:', error);
  }
}
