import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

export async function describeWithGPT4(storyboardBase64: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-vision-preview',
    messages: [
      {
        role: 'system',
        content: `
          You are an AI assistant equipped with advanced vision capabilities,
          specializing in real-time operational efficiency analysis.
          Your task is to continuously monitor a set of six images,numbered 1 to 6,
          taken consecutively from security footage.
          Each image represents a frame in a storyboard format, originating from a surveillance camera.
          Your role is to provide highly detailed descriptions of these images, focusing on activities,
          the number of individuals present, and interactions occurring within the scene. 
          The descriptions should be tailored to optimize operational processes. 
          While providing these descriptions, maintain moderate privacy considerations, 
          avoiding excessive personal detail. 
          Try to identify any brands if possible.
          Events you should observe for: Lights on, Lights off
          `,
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
              url: `data:image/jpeg;base64,${storyboardBase64}`,
              // detail: 'high',
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

  console.log('inputTokens: ', response?.usage?.prompt_tokens);
  console.log('outputTokens: ', response?.usage?.completion_tokens);
  console.log('totalTokens: ', response?.usage?.total_tokens);

  return response.choices[0].message.content;
}
