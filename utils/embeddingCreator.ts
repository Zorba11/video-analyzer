import { openai } from '../openai/openaiConfig';
import { supabase } from '../db/supabaseConfig';
import fs from 'fs';
import path from 'path';
import { insertRow } from '../db/dbFunctions';
import { Transcription } from 'openai/resources/audio/transcriptions';
import { Embeddings } from 'openai/resources';

interface Word {
  word: string;
  start: number;
  end: number;
  embedding?: number[];
}

interface WordAudioTranscrTable {
  word: string;
  start_time: number;
  end_time: number;
  video_id: number;
  embedding?: number[];
}

interface TrascriptWithWords extends Transcription {
  words: Word[];
}

const EMBEDDINGS_MODEL = 'text-embedding-3-small';

const AUDIO_TRANSCRIPTION_TABLE = 'audio_transcriptions';
const VIDEOS_TABLE = 'videos';
const AUDIO_TRANSCRIPT_COLUMN = 'audio_transcript';
const AUDIO_TRANSCRIPT_VECTOR_COLUMN = 'aud_tr_vectors';

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

export async function transcribeAudio(absoluteAudioPath: string) {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(absoluteAudioPath),
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
    });

    return transcription;
  } catch (error) {
    console.error('Failed to transcribe audio:', error);
  }
}

export async function createAudioVideoEmbeddings(
  outputFolderPath: string,
  fileName: string
) {
  try {
    const videoPath = path.join(outputFolderPath, fileName);

    await insertVideoInfoToDB(fileName, videoPath);

    const audioPath = buildAudioPath(videoPath);

    const transcription = await transcribeAudio(audioPath);

    await insertAudioTranscriptToDB(
      fileName,
      transcription as TrascriptWithWords
    );

    // const audioEmbeddings = await createAudioEmbeddings(audioPath);
    // const videoEmbeddings = await createVideoEmbeddings(videoPath);

    // return { audioEmbeddings, videoEmbeddings };
  } catch (error) {
    console.error('Failed to create audio and video embeddings:', error);
  }
}

const outputPath =
  '/Users/ageorge/Desktop/gpt-4v-trials/extractions/1709146228347-Forrest_Gump/';

const fileName = '1709146228347-Forrest_Gump.mp4';

async function insertVideoInfoToDB(fileName: string, videoPath: string) {
  const data = {
    title: fileName,
    uploaded_by: 123, // Assuming this is a user ID
    video_url: videoPath,
    thumbnail_url: '',
    upload_date: new Date().toISOString(), // Use the current date and time
  };

  // Insert the video info into the `videos` table
  await insertRow(VIDEOS_TABLE, data);
}

async function insertAudioTranscriptToDB(
  fileName: string,
  transcript: Transcription
) {
  const videoIds = await getVideoIdByFilename(fileName);

  if (!videoIds) {
    console.error('Failed to get video ID by filename');
    return;
  }

  const videoId = videoIds[0];

  await insertWords(videoId, transcript as TrascriptWithWords);

  await audioTrsToVideosTable(videoId, transcript.text);

  // Insert the audio info into the `audio_transcripts` table
  // await insertRow(AUDIO_TRANSCRIPTION_TABLE, data);
}

async function audioTrsToVideosTable(videoId: number, transcript: string) {
  const trnscrptEmbeddings = await createEmbeddings(
    EMBEDDINGS_MODEL,
    transcript
  );

  // Update the audio info into the `videos` table
  await updateTable(VIDEOS_TABLE, videoId, {
    audio_transcript: transcript,
    aud_tr_vectors: trnscrptEmbeddings?.data[0].embedding,
  });
}

async function updateTable(
  tableName: string,
  videoId: number,
  updateValues: Record<string, unknown>
) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .update(updateValues)
      .eq('id', videoId)
      .select();

    if (error) {
      console.error('Error updating table:', error);
    }
  } catch (error) {
    console.error('Failed to update table:', error);
  }
}

async function insertWords(videoId: number, transcript: TrascriptWithWords) {
  for (const word of transcript.words) {
    const data = {
      video_id: videoId,
      word: word.word,
      start_time: word.start,
      end_time: word.end,
    } as WordAudioTranscrTable;

    const dataEmbedding = await createEmbeddings(
      EMBEDDINGS_MODEL,
      JSON.stringify(data)
    );

    // Add the dataEmbedding to the data object
    data.embedding = dataEmbedding?.data[0].embedding;

    const { error } = await supabase
      .from(AUDIO_TRANSCRIPTION_TABLE)
      .upsert([data]);

    if (error) {
      console.error('Error inserting word:', error);
    }
  }
}

// Function to get video ID by filename
async function getVideoIdByFilename(
  filename: string
): Promise<number[] | null> {
  try {
    const { data, error } = await supabase
      .from('videos')
      .select('id')
      .eq('title', filename);

    if (error) {
      console.error('Error retrieving data', error);
      return null;
    }

    // Extract the ids from the data array
    const ids = data.map((row) => row.id);
    return ids;
  } catch (error) {
    console.error('Failed to get video ID by filename:', error);
    return null;
  }
}

function buildAudioPath(videoPath: string) {
  let parsedPath = path.parse(videoPath);

  // Change the extension to .mp3
  parsedPath.ext = '.mp3';
  parsedPath.base = `${parsedPath.name}${parsedPath.ext}`;

  // Format the path back to a string
  const audioPath = path.format(parsedPath);
  return audioPath;
}

createAudioVideoEmbeddings(outputPath, fileName);
