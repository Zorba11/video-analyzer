import { openai } from '../openai/openaiConfig';
import { supabase } from '../db/supabaseConfig';
import fs from 'fs';
import path from 'path';
import { insertRow } from '../db/dbFunctions';
import { Transcription } from 'openai/resources/audio/transcriptions';
import { Embeddings } from 'openai/resources';
import { exec } from 'child_process';
import { transcribeAudio } from '../apis/audioApis';
import { createEmbeddings } from '../apis/embeddings';
import sharp from 'sharp';
import util from 'util';

const readFile = util.promisify(fs.readFile);

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

const AUDIO_TRANSCRIPTION_TABLE = 'audio_transcriptions';
const VIDEOS_TABLE = 'videos';
const AUDIO_TRANSCRIPT_COLUMN = 'audio_transcript';
const AUDIO_TRANSCRIPT_VECTOR_COLUMN = 'aud_tr_vectors';

export async function createAudioVideoEmbeddings(
  outputFolderPath: string,
  fileName: string
) {
  try {
    const videoPath = path.join(outputFolderPath, fileName);

    // await insertVideoInfoToDB(fileName, videoPath);

    // const audioPath = buildAudioPath(videoPath);

    // const audioDuration = await getAudioDuration(audioPath);

    // console.log('Audio duration:', audioDuration);

    // const transcription = await transcribeAudio(audioPath, audioDuration);

    // await insertAudioTranscriptToDB(
    //   fileName,
    //   transcription as TrascriptWithWords
    // );

    const framesDir = path.dirname(videoPath);

    await processVideo(framesDir, fileName);

    // const videoEmbeddings = await createVideoEmbeddings(videoPath);

    // return { audioEmbeddings, videoEmbeddings };
  } catch (error) {
    console.error('Failed to create audio and video embeddings:', error);
  }
}

async function processVideo(videoFramesPath: string, fileName: string) {
  try {
    createStoryboardFromFrames(videoFramesPath);
  } catch (error) {
    console.error('Failed to process video:', error);
  }
}

async function createStoryboardFromFrames(videoFramesPath: string) {
  try {
    const outputPath = path.join(videoFramesPath, 'storyboards');
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath);
    }

    const frames = fs
      .readdirSync(videoFramesPath)
      .filter((file) => file.endsWith('.jpg'));

    const newWidth = 627; // new width for each frame
    const newHeight = 527; // new height for each frame
    const gap = 10; // gap between images and borders

    for (let i = 0; i < frames.length; i += 6) {
      const compositeImages = [];
      let startFrame, endFrame;
      let rowCount = 0; // number of rows in the current composite image
      let columnCount = 0; // number of columns in the current composite image

      for (let j = 0; j < 6; j++) {
        if (i + j < frames.length) {
          const frame = frames[i + j];
          const imageBuffer = await readFile(`${videoFramesPath}/${frame}`);
          const resizedBuffer = await sharp(imageBuffer)
            .resize(newWidth, newHeight)
            .toBuffer();
          compositeImages.push({
            input: resizedBuffer,
            top: gap + Math.floor(j / 3) * (newHeight + gap),
            left: gap + (j % 3) * (newWidth + gap),
          });

          // Extract frame number from filename
          const frameNumber = frame.slice(-8, -4);
          if (j === 0) startFrame = frameNumber;
          if (j === 5 || i + j === frames.length - 1) endFrame = frameNumber;

          rowCount = Math.max(rowCount, Math.floor(j / 3) + 1);
          columnCount = Math.max(columnCount, (j % 3) + 1);
        }
      }

      sharp({
        create: {
          width: columnCount * (newWidth + gap) + gap, // adjust the width to account for the gaps
          height: rowCount * (newHeight + gap) + gap, // adjust the height to account for the gaps
          channels: 3,
          background: { r: 0, g: 0, b: 0 },
        },
      })
        .composite(compositeImages)
        .toFile(`${outputPath}/${startFrame}to${endFrame}.jpg`)
        .catch((err) => console.error(err));
    }
  } catch (err) {
    console.error(err);
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
  const trnscrptEmbeddings = await createEmbeddings(transcript, 'audio');

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

    const dataEmbedding = await createEmbeddings(JSON.stringify(data), 'words');

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

function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    exec(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${filePath}`,
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(parseFloat(stdout));
        }
      }
    );
  });
}

createAudioVideoEmbeddings(outputPath, fileName);
