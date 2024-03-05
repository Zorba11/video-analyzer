import { createEmbeddings } from '../apis/embeddings';
import { summarizeVideoFramesWithGPT } from '../apis/textLLMApis';
import { supabase } from './supabaseConfig';

export async function insertRow(tableName: string, data: any) {
  try {
    const { data: insertedData, error } = await supabase
      .from(tableName)
      .insert([data]);

    if (error) {
      console.error('Failed to insert data:', error);
      return;
    }

    console.log('Inserted data:', insertedData);
  } catch (error) {
    console.error('Failed to insert data:', error);
  }
}

// Function to get video ID by filename
export async function getVideoIdByFilename(
  filename: string
): Promise<number[] | null> {
  try {
    if (!filename.endsWith('.mp4')) {
      filename = `${filename}.mp4`;
    }

    const { data, error } = await supabase
      .from('videos')
      .select('id')
      .eq('title', `${filename}`);

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

export async function createChat(videoId: number) {
  try {
    const data = {
      video_id: videoId,
      sender: 'AI',
      message:
        "Hello, I'm your Video AI. What do you want to know about this video?",
    };

    if (videoId) {
      const { data: any, error } = await supabase
        .from('video_chats')
        .insert([data])
        .select();
    }
  } catch (error) {
    console.error('Failed to create chat:', error);
  }
}

export async function retrieveChat(videoId: number) {
  try {
    if (videoId) {
      const { data, error } = await supabase
        .from('video_chats')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to retrieve chat:', error);
        return;
      }
      return data;
    }
    return [];
  } catch (error) {
    console.error('Failed to retrieve chat:', error);
  }
}

export async function findSimilarItems(
  vector: number[],
  limit: number = 5
): Promise<any> {
  try {
    // Construct the query for similarity search using L2 distance
    const query = `
      SELECT *, (embedding <-> array[${vector.join(',')}]) AS distance
      FROM items
      ORDER BY embedding <-> array[${vector.join(',')}]
      LIMIT ${limit};
    `;

    // Execute the query using the Supabase client
    let { data, error } = await supabase.rpc('raw', { query: query });

    // Check for errors
    if (error) throw error;

    // Return the query result
    return data;
  } catch (error) {
    console.error('Error finding similar items:', error);
    return null;
  }
}

export async function searchForPhraseEmbedding(
  phraseVector: number[],
  videoId: number,
  similarityThreshold: number
): Promise<any> {
  try {
    let { data, error } = await supabase.rpc(
      'search_for_phrase_audio_embedding',
      {
        phrase_vector: phraseVector,
        videoId: videoId,
        similarity_threshold: similarityThreshold,
      }
    );

    if (error) {
      throw error;
    }

    console.log('Matching transcriptions:', data);
    return data;
  } catch (error) {
    console.error('Error searching for phrase embedding:', error);
    return null;
  }
}

export async function getVideoFramesMetadata(videoId: number): Promise<any> {
  try {
    let { data, error } = await supabase
      .from('video_frames')
      .select('frame_number, frame_description, entitiesdetected')
      .eq('video_id', videoId);

    if (error) {
      throw error;
    }

    console.log('Video frames summary:', data);
    return data;
  } catch (error) {
    console.error('Error getting video frames summary:', error);
    return null;
  }
}

export async function getAudioSummaryByVideoId(
  videoId: number
): Promise<string | null> {
  try {
    let { data, error } = await supabase
      .from('videos')
      .select('audio_transcript')
      .eq('id', videoId);

    if (error) {
      throw error;
    }

    if (data?.length) {
      return data[0].audio_transcript;
    }

    return null;
  } catch (error) {
    console.error('Error getting audio summary by video ID:', error);
    return null;
  }
}

export async function summarizeAudioVideoFrames(
  videoId: number,
  isAudioAvailable: boolean = false
): Promise<any> {
  try {
    const framesData = await getVideoFramesMetadata(videoId);
    let summarizedResponse;
    if (isAudioAvailable) {
      const audioTranscript = await getAudioSummaryByVideoId(videoId);

      summarizedResponse = await summarizeVideoFramesWithGPT(
        JSON.stringify(framesData),
        audioTranscript as string
      );
    } else {
      summarizedResponse = await summarizeVideoFramesWithGPT(
        JSON.stringify(framesData)
      );
    }

    return summarizedResponse;
  } catch (error) {
    console.error('Error summarizing video frames:', error);
    return null;
  }
}

export async function storeVideoSummaryInDB(videoId: number, summary: string) {
  try {
    const data = {
      id: videoId,
      frame_summary_txt: summary,
    };

    //  update supabase row
    const { data: any, error } = await supabase.from('videos').upsert([data]);
  } catch (error) {
    console.error('Error storing video summary in DB:', error);
  }
}

export async function checkVideoSummaryExist(
  videoId: number
): Promise<boolean> {
  try {
    let { data, error } = await supabase
      .from('videos')
      .select('frame_summary_txt')
      .eq('id', videoId);

    if (error) {
      throw error;
    }

    if (data?.length) {
      return data[0].frame_summary_txt ? true : false;
    }

    return false;
  } catch (error) {
    console.error('Error checking video summary existence:', error);
    return false;
  }
}

export async function getVideoAudioSummary(videoId: number): Promise<string> {
  try {
    let { data, error } = await supabase
      .from('videos')
      .select('frame_summary_txt')
      .eq('id', videoId);

    if (error) {
      throw error;
    }

    if (data?.length) {
      return data[0].frame_summary_txt;
    }

    return 'No Summary Available';
  } catch (error) {
    console.error('Error checking video summary existence:', error);
    return 'There was an error retrieving the summary';
  }
}

// Define an async function to perform the search
async function searchWordSequence(sequence: string[]) {
  // Join the sequence into a single string for full-text search
  const sequenceString = sequence.join(' & ');

  // Write the SQL query to find the sequence
  // This is a simplified query - you'll need to adapt it to your needs
  const query = `
    WITH word_sequences AS (
      SELECT
        video_id,
        string_agg(word, ' ') OVER (PARTITION BY video_id ORDER BY start_time RANGE BETWEEN CURRENT ROW AND INTERVAL '1 second' FOLLOWING) as word_sequence,
        start_time,
        LEAD(end_time) OVER (PARTITION BY video_id ORDER BY start_time) AS sequence_end_time
      FROM
        your_table_name
    )
    SELECT
      video_id,
      start_time AS sequence_start_time,
      sequence_end_time
    FROM
      word_sequences
    WHERE
      to_tsvector('english', word_sequence) @@ to_tsquery('english', :sequenceString);
  `;

  // Execute the query using the Supabase client
  const { data, error } = await supabase.rpc('execute_sql_query', {
    sequenceString: sequenceString,
  });

  // Handle the results
  if (error) {
    console.error('Error executing query:', error);
    return;
  }

  return data;
}

// getVideoAudioSummary(16);

export async function searchSequence(
  videoId: number,
  sequenceEmbedding: number[]
) {
  try {
    // Call the stored procedure
    const { data, error } = await supabase.rpc('vector_search_sequences', {
      video_id_param: videoId,
      sequence_embedding: sequenceEmbedding,
    });

    if (error) {
      console.error('Error calling vector_search_sequences:', error);
      return;
    }

    console.log('Search results:', data);
    return data;
  } catch (err) {
    console.error('Exception calling vector_search_sequences:', err);
  }
}

export async function searchThroughFrames(
  videoId: number,
  sequenceEmbedding: number[]
) {
  try {
    // Call the stored procedure
    const { data, error } = await supabase.rpc('search_frames_by_entities', {
      video_id_param: videoId,
      entity_embedding: sequenceEmbedding,
    });

    if (error) {
      console.error('Error calling vector_search_frames:', error);
      return;
    }

    console.log('Search results:', data);
    return data;
  } catch (err) {
    console.error('Exception calling vector_search_frames:', err);
  }
}
