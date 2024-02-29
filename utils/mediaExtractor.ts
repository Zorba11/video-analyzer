// extract frames from a video
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { openai } from '../openai/openaiConfig';

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
  // Create a new Promise
  return new Promise((resolve, reject) => {
    // Check if video file exists
    if (!fs.existsSync(videoPath)) {
      reject('Video file does not exist');
      return;
    }

    // Check if output folder exists, if not create it
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    // Check if output folder is writable
    try {
      fs.accessSync(outputFolder, fs.constants.W_OK);
    } catch (err) {
      reject('Output folder is not writable');
      return;
    }

    // Start the ffmpeg command
    ffmpeg(videoPath)
      // Set the output path and filename format
      .output(`${outputFolder}/frame-%04d.jpg`)
      // Set the output options
      .outputOptions([`-vf fps=${frameRate}`])
      // Define what happens when the command ends
      .on('end', () => {
        console.log('Frames extracted successfully!');
        resolve('Frames extracted successfully!');
      })
      // Define what happens when an error occurs
      .on('error', (err) => {
        console.error('An error occurred while extracting frames: ', err);
        reject('Error occurred while extracting frames');
      })
      // Run the command
      .run();
  });
}

export async function extractAudio(
  videoPath: string,
  outputFolderPath: string
) {
  return new Promise((resolve, reject) => {
    const videoFileName = path.basename(videoPath, path.extname(videoPath));
    const audioFileName = `${videoFileName}.mp3`;
    const outputPath = path.join(outputFolderPath, audioFileName);

    ffmpeg(videoPath)
      .output(outputPath)
      .audioCodec('libmp3lame') // Use the MP3 codec
      .on('end', () => resolve(outputPath))
      .on('error', (err) => {
        console.error('Error extracting audio:', err);
        reject('Error occurred while extracting audio');
      })
      .run();

    resolve(outputPath);
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

export async function extractMediaAndTranscribe(
  videoPath: string,
  outputPath: string
) {
  try {
    // Extract frames from video
    await extractFrames(videoPath, 1, outputPath);

    // Extract audio from video
    await extractAudio(videoPath, outputPath);
  } catch (error) {
    console.error('Error extracting media and transcribing:', error);
  }
}
