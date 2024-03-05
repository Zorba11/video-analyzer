import { VideoAudioSummarizationPrompt } from '../SystemPrompts';
import { openai } from '../openai/openaiConfig';
const INPUT_TOKEN_COST = 0.01;
const OUTPUT_TOKEN_COST = 0.03;

export async function askGPT4(
  prompt: string,
  userPrompt: string = 'Summarize the video',
  model?: string
) {
  try {
    const response = await openai.chat.completions.create({
      model: !model ? 'gpt-4' : model,
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userPrompt,
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    console.log('response: ', response);

    const inputTokens = response?.usage?.prompt_tokens;
    const outputTokens = response?.usage?.completion_tokens;

    const inputCost = (inputTokens! / 1000) * INPUT_TOKEN_COST;
    const outputCost = (outputTokens! / 1000) * OUTPUT_TOKEN_COST;

    const totalCost = inputCost + outputCost;

    console.log('-----Summarize six seconds cost------');
    console.log('inputTokens: ', inputTokens);
    console.log('outputTokens: ', outputTokens);
    console.log('totalTokens: ', response?.usage?.total_tokens);
    console.log('inputCost: ', inputCost);
    console.log('outputCost: ', outputCost);
    console.log('totalCost: ', totalCost);
    console.log('-----Done------');

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Failed to summarize video:', error);
  }
}

export async function summarizeVideoFramesWithGPT(
  framesData: string,
  audioTranscript?: string
) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-0125-preview', // has the 128k context
      messages: [
        {
          role: 'system',
          content: VideoAudioSummarizationPrompt,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Here's the frameData: ${framesData}. And here's the audio transcript: ${
                audioTranscript ? audioTranscript : 'no audio available'
              }`,
            },
          ],
        },
      ],
      // max_tokens: 2000,
    });

    console.log('response: ', response);

    const inputTokens = response?.usage?.prompt_tokens;
    const outputTokens = response?.usage?.completion_tokens;

    const inputCost = (inputTokens! / 1000) * INPUT_TOKEN_COST;
    const outputCost = (outputTokens! / 1000) * OUTPUT_TOKEN_COST;

    const totalCost = inputCost + outputCost;

    console.log('-----Summarize video frames cost------');
    console.log('inputTokens: ', inputTokens);
    console.log('outputTokens: ', outputTokens);
    console.log('totalTokens: ', response?.usage?.total_tokens);
    console.log('inputCost: ', inputCost);
    console.log('outputCost: ', outputCost);
    console.log('totalCost: ', totalCost);
    console.log('-----Done------');

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Failed to summarize video frames:', error);
  }
}

export async function generateSpeech(text: string): Promise<ArrayBuffer> {
  try {
    if (!text) {
      throw new Error('No text provided to generate speech.');
    }
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      input: text,
      voice: 'alloy', // You can choose different voices as per your preference
    });

    if (response) {
      const audioContent = await response.arrayBuffer();
      return audioContent;
    } else {
      throw new Error('No audio data received from the API.');
    }
  } catch (error) {
    console.error('Error generating speech:', error);
    throw error;
  }
}
