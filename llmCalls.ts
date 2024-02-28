import { openai } from './openai/openaiConfig';

const INPUT_TOKEN_COST = 0.01;
const OUTPUT_TOKEN_COST = 0.03;

export async function describeBaseScene(base64Img: string, time: number) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-vision-preview',
    messages: [
      {
        role: 'system',
        content: `
          You should describe the scene in the image and extract any valuable information from it.
          In the scene if you are seeing any cars or vehicles, you should describe the make and model of the vehicle as
          accurately as possible. Also, tell us the position of the cars. Also, count the total number of vehicles in the scene.
        `,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Describe what is in the scene? This image was taken at ${new Date(
              time
            ).toLocaleString()}`,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Img}`,
              // detail: 'high',
            },
          },
        ],
      },
    ],
    max_tokens: 2000,
  });

  const resp = {
    description: response.choices[0].message.content,
    inputTokens: response?.usage?.prompt_tokens,
    outputTokens: response?.usage?.completion_tokens,
    totalTokens: response?.usage?.total_tokens,
  };

  console.log('base description: ', response.choices[0].message.content);

  return response.choices[0].message.content;
}

export async function describeWithGPT4(
  storyboardBase64: string[],
  prompt: string
) {
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
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${storyboardBase64[0]}`,
              // detail: 'high',
            },
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${storyboardBase64[1]}`,
              // detail: 'high',
            },
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${storyboardBase64[2]}`,
              // detail: 'high',
            },
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${storyboardBase64[3]}`,
              detail: 'high',
            },
          },
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
}
