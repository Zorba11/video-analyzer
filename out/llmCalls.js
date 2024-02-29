"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.describeWithGPT4 = exports.describeBaseScene = void 0;
const openaiConfig_1 = require("./openai/openaiConfig");
const INPUT_TOKEN_COST = 0.01;
const OUTPUT_TOKEN_COST = 0.03;
async function describeBaseScene(base64Img, time) {
    var _a, _b, _c;
    const response = await openaiConfig_1.openai.chat.completions.create({
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
                        text: `Describe what is in the scene? This image was taken at ${new Date(time).toLocaleString()}`,
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
        inputTokens: (_a = response === null || response === void 0 ? void 0 : response.usage) === null || _a === void 0 ? void 0 : _a.prompt_tokens,
        outputTokens: (_b = response === null || response === void 0 ? void 0 : response.usage) === null || _b === void 0 ? void 0 : _b.completion_tokens,
        totalTokens: (_c = response === null || response === void 0 ? void 0 : response.usage) === null || _c === void 0 ? void 0 : _c.total_tokens,
    };
    console.log('base description: ', response.choices[0].message.content);
    return response.choices[0].message.content;
}
exports.describeBaseScene = describeBaseScene;
async function describeWithGPT4(storyboardBase64, prompt) {
    var _a, _b, _c, _d, _e, _f;
    const response = await openaiConfig_1.openai.chat.completions.create({
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
        inputTokens: (_a = response === null || response === void 0 ? void 0 : response.usage) === null || _a === void 0 ? void 0 : _a.prompt_tokens,
        outputTokens: (_b = response === null || response === void 0 ? void 0 : response.usage) === null || _b === void 0 ? void 0 : _b.completion_tokens,
        totalTokens: (_c = response === null || response === void 0 ? void 0 : response.usage) === null || _c === void 0 ? void 0 : _c.total_tokens,
    };
    const inputTokens = (_d = response === null || response === void 0 ? void 0 : response.usage) === null || _d === void 0 ? void 0 : _d.prompt_tokens;
    const outputTokens = (_e = response === null || response === void 0 ? void 0 : response.usage) === null || _e === void 0 ? void 0 : _e.completion_tokens;
    const inputCost = (inputTokens / 1000) * INPUT_TOKEN_COST;
    const outputCost = (outputTokens / 1000) * OUTPUT_TOKEN_COST;
    const totalCost = inputCost + outputCost;
    console.log('inputTokens: ', inputTokens);
    console.log('outputTokens: ', outputTokens);
    console.log('totalTokens: ', (_f = response === null || response === void 0 ? void 0 : response.usage) === null || _f === void 0 ? void 0 : _f.total_tokens);
    console.log('inputCost: ', inputCost);
    console.log('outputCost: ', outputCost);
    console.log('totalCost: ', totalCost);
    return response.choices[0].message.content;
}
exports.describeWithGPT4 = describeWithGPT4;
//# sourceMappingURL=llmCalls.js.map