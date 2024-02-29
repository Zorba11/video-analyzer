import { openai } from '../openai/openaiConfig';
import fs from 'fs';

const WHISPER_API_COST = 0.006;

export async function transcribeAudio(
  absoluteAudioPath: string,
  duration: number
) {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(absoluteAudioPath),
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
    });

    const cost = WHISPER_API_COST * (duration / 60);

    console.log('Transcription cost:', cost);

    return transcription;
  } catch (error) {
    console.error('Failed to transcribe audio:', error);
  }
}
