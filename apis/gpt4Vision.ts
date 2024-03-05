import { openai } from '../openai/openaiConfig';
import * as fs from 'fs';
import * as util from 'util';
import * as path from 'path';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { InitialVideoDetectionPrompt } from '../SystemPrompts';
import { createEmbeddings } from './embeddings';
import { createChat, getVideoIdByFilename, insertRow } from '../db/dbFunctions';
import { askGPT4 } from './textLLMApis';

const INPUT_TOKEN_COST = 0.01;
const OUTPUT_TOKEN_COST = 0.03;

const VIDEO_FRAMES_TABLE = 'video_frames';

const readFile = util.promisify(fs.readFile);

export interface FrameInsight {
  frameNumber: number;
  description: string;
  entitiesDetected: string[];
}

export async function processStoryBoard(
  storyboardPath: string,
  prompt: string,
  fileName: string
) {
  try {
    const videoId = await getVideoIdByFilename(fileName);

    let previousFrameSummary = '';
    const files = fs
      .readdirSync(storyboardPath)
      .filter((file) => file.endsWith('.jpg'));

    const storyboardBase64 = await Promise.all(
      files.map((file) =>
        readFile(path.join(storyboardPath, file)).then((data) =>
          data.toString('base64')
        )
      )
    );

    for (let i = 0; i < storyboardBase64.length; i++) {
      const startFrame1 = files[i].slice(0, 4);
      const endFrame1 = files[i].slice(7, 10);
      const frameInfo1 = `This image contains frames from ${startFrame1} to ${endFrame1} seconds of the video.`;

      const messages: ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `${frameInfo1}. ${
                previousFrameSummary
                  ? `Here is what happened till now: ${previousFrameSummary}`
                  : ''
              }`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${storyboardBase64[i]}`,
              },
            },
          ],
        },
      ];

      const response = await openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: messages,
        max_tokens: 1000,
      });

      console.log('response: ', response);

      const description = response.choices[0].message.content;

      const inputTokens = response?.usage?.prompt_tokens;
      const outputTokens = response?.usage?.completion_tokens;

      const inputCost = (inputTokens! / 1000) * INPUT_TOKEN_COST;
      const outputCost = (outputTokens! / 1000) * OUTPUT_TOKEN_COST;

      const totalCost = inputCost + outputCost;

      console.log('inputTokens: ', inputTokens);
      console.log('outputTokens: ', outputTokens);
      console.log('totalTokens: ', response?.usage?.total_tokens);
      console.log('inputCost: ', inputCost);
      console.log('outputCost: ', outputCost);
      console.log('totalCost: ', totalCost);

      const frameInsightList: FrameInsight[] = parseFrameInsightList(
        description as string
      ) as FrameInsight[];

      await storeInsightsInDB(
        frameInsightList,
        videoId?.length ? videoId[0] : 0
      );

      if (description) {
        const summary = await askGPT4(description);
        if (summary) {
          previousFrameSummary = summary;
        }
      }

      // Handle the response...
    }

    // create the chat here
    console.log('-----PROCESSED ALL STORYBOARDS------');
    await createChat(videoId?.length ? videoId[0] : 0);
    console.log('-----CREATED CHAT------');
  } catch (error) {
    console.error('Failed to describe video storyboards:', error);
  }
}

async function storeInsightsInDB(
  insights: FrameInsight[],
  videoId: number = 0
) {
  try {
    // LOOP THROUGH INSIGHTS AND STORE IN DB
    insights.forEach(async (insight) => {
      const { frameNumber, description, entitiesDetected } = insight;

      const insightEmbeddings = await createEmbeddings(JSON.stringify(insight));

      const data = {
        video_id: videoId,
        frame_number: frameNumber,
        frame_description: description,
        entitiesdetected: entitiesDetected,
        embedding: insightEmbeddings?.data[0].embedding,
      };

      await insertRow(VIDEO_FRAMES_TABLE, data);
    });
  } catch (error) {
    console.error('Failed to store insights in db:', error);
  }
}

function parseFrameInsightList(description: string) {
  try {
    const matchResult = description?.match(/```json\n([\s\S]*?)\n```/);

    let actions;

    if (!matchResult) actions = JSON.parse(description);

    if (matchResult) {
      actions = JSON.parse(matchResult[1]);
    }

    return actions;
  } catch (error) {
    console.error('Failed to parse frame insight list:', error);
  }
}

export async function describeVideoStoryBoards(
  storyboardPath: string,
  prompt: string
) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
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
              text: 'Describe what happened in the scene?',
            },
            // {
            //   type: 'image_url',
            //   image_url: {
            //     url: `data:image/jpeg;base64,${storyboardBase64[0]}`,
            //     // detail: 'high',
            //   },
            // },
          ],
        },
      ],
      max_tokens: 1500,
    });

    console.log("here's what I saw: ", response.choices[0].message.content);

    const resp = {
      description: response.choices[0].message.content,
      inputTokens: response?.usage?.prompt_tokens,
      outputTokens: response?.usage?.completion_tokens,
      totalTokens: response?.usage?.total_tokens,
    };

    const inputTokens = response?.usage?.prompt_tokens;
    const outputTokens = response?.usage?.completion_tokens;

    const inputCost = (inputTokens! / 1000) * INPUT_TOKEN_COST;
    const outputCost = (outputTokens! / 1000) * OUTPUT_TOKEN_COST;

    const totalCost = inputCost + outputCost;

    console.log('inputTokens: ', inputTokens);
    console.log('outputTokens: ', outputTokens);
    console.log('totalTokens: ', response?.usage?.total_tokens);
    console.log('inputCost: ', inputCost);
    console.log('outputCost: ', outputCost);
    console.log('totalCost: ', totalCost);

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Failed to describe video storyboards:', error);
  }
}

const storyboardPath =
  '/Users/ageorge/Desktop/gpt-4v-trials/extractions/1709254569974-Forrest_Gump/storyboards';

const fileName = '1709254569974-Forrest_Gump';

// processStoryBoard(storyboardPath, InitialVideoDetectionPrompt, fileName);
