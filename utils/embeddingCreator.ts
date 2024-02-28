import { openai } from '../openai/openaiConfig';
import { supabase } from '../db/supabaseConfig';

const EMBEDDINGS_MODEL = 'text-embedding-3-small';

export async function createEmbeddings(model: string, text: string) {
  try {
    const embeddings = await openai.embeddings.create({
      model: model,
      input: text,
      encoding_format: 'float',
    });

    return embeddings;
  } catch (error) {
    console.error('Failed to create embeddings:', error);
  }
}

export async function createEmbeddingsAndInsert(
  model: string,
  text: string,
  videoId: number,
  videoName: string,
  timestamp: number
) {
  try {
    const embeddingsResponse = await createEmbeddings(EMBEDDINGS_MODEL, text);

    const embeddings = embeddingsResponse?.data[0].embedding;

    // const embeddingsForDb = `{${embeddings?.join(',')}}`; // Formatting as a PostgreSQL array

    // Construct the SQL query
    const { data, error } = await supabase.from('video_descriptions').insert([
      {
        video_id: videoId,
        video_name: videoName,
        description: text,
        desc_timestamp: timestamp,
        description_vector: embeddings, // This assumes your column accepts an array directly. Adjust based on actual setup.
      },
    ]);

    if (error) {
      console.error('Error inserting data:', error);

      // Insert embeddings into the database
      // await insertEmbeddings(embeddings, videoId, videoName, timestamp);
    }
  } catch (error) {
    console.error('Failed to create embeddings:', error);
  }
}

async function searchSimilarDescriptions(queryVector: number[]) {
  // // Assuming queryVector is an array of numbers and you want to use the first two as a point
  // const pointRepresentation = `(${queryVector[0]}, ${queryVector[1]})`; // Convert to point format
  try {
    const { data, error } = await supabase
      .rpc('search_by_vector', { query_vector: queryVector })
      .order('distance', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Search error:', error);
      return;
    }
    console.log('Search results:', data[0]);
  } catch (error) {
    console.error('Failed to search for similar descriptions:', error);
  }
}

// createEmbeddings(
//   'text-embedding-3-small',
//   'What is the capital of France?'
// ).then((queryEmbeddings) => {
//   if (!queryEmbeddings) return;
//   searchSimilarDescriptions(queryEmbeddings.data[0].embedding);
// });

// Example usage

// const dummyJson = {
//   questions: [
//     {
//       question: 'What is the capital of France?',
//       answer: 'The capital of France is Paris.',
//     },
//     {
//       question: "Who wrote the play 'Romeo and Juliet'?",
//       answer: "The play 'Romeo and Juliet' was written by William Shakespeare.",
//     },
//   ],
// };

// createEmbeddingsAndInsert(
//   EMBEDDINGS_MODEL,
//   JSON.stringify(dummyJson),
//   2,
//   'My Second Video',
//   12345
// );
