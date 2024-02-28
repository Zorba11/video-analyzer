// extract frames from a video
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { openai } from '../openai/openaiConfig';};

interface TranscriptionCreateParams {
  // Other existing properties
  file: fs.ReadStream;
  model: string;
  response_format: string;
  timestamp_granularities: string[];
}

const absolutePathToFile =
  '/Users/ageorge/Desktop/gpt-4v-trials/uploads/1708962811670-Forrest_Gump.mp4';

const outputFolderPath = path.join(
  __dirname,
  '../frames/1708962811670-Forrest_Gump/'
);

const absoluteAudioPath = path.join(
  __dirname,
  '../frames/1708962811670-Forrest_Gump/extracted_audio.mp3'
);

// Ensure the output directory exists
if (!fs.existsSync(outputFolderPath)) {
  fs.mkdirSync(outputFolderPath, { recursive: true });
}

// Function to extract frames from video
export async function extractFrames(
  videoPath: string,
  frameRate: number = 1,
  outputFolder: string
) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .output(`${outputFolder}/frame-%04d.jpg`)
      .outputOptions([`-vf fps=${frameRate}`])
      .on('end', () => resolve('Frames extracted successfully!'))
      .on('error', (err) => {
        console.error('error: ', err);
        reject('Error occurred while extracting frames');
      })
      .run();
  });
}

export async function extractAudio(
  videoPath: string,
  outputFolderPath: string
) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(outputFolderPath, 'extracted_audio.mp3');

    ffmpeg(videoPath)
      .output(outputPath)
      .audioCodec('libmp3lame') // Use the MP3 codec
      .on('end', () => resolve(outputPath))
      .on('error', (err) => {
        console.error('Error:', err);
        reject('Error occurred while extracting audio');
      })
      .run();
  });
}

// Example usage: Extract frames at a rate of 1 frame per second
// async function extractFramesFromVideo() {
//   await extractFrames(absolutePathToFile, 1, outputFolderPath);
// }

// async function extractAudioFromVideo() {
//   try {
//     const audioPath = await extractAudio(absolutePathToFile, outputFolderPath);
//     console.log('Audio extracted to:', audioPath);
//   } catch (error) {
//     console.error('Failed to extract audio:', error);
//   }
// }

// extractFramesFromVideo();
// extractAudioFromVideo();

export async function transcribeAudio(absoluteAudioPath: string) {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(absoluteAudioPath),
    model: 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['word'],
  });

  return transcription;
}

export async function extractMediaAndTranscribe(videoPath: string) {
  // Extract frames from video
  await extractFrames(absolutePathToFile, 1, outputFolderPath);

  // Extract audio from video
  const audioPath = await extractAudio(absolutePathToFile, outputFolderPath);

  // Transcribe the audio
  const transcribe = await transcribeAudio(absoluteAudioPath);
}
