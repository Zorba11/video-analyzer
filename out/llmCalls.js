"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.describeWithGPT4 = exports.describeBaseScene = void 0;
const openai_1 = __importDefault(require("openai"));
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
async function describeBaseScene(base64Img, time) {
    var _a, _b, _c;
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
async function describeWithGPT4(storyboardBase64) {
    var _a, _b, _c, _d, _e, _f;
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
        inputTokens: (_a = response === null || response === void 0 ? void 0 : response.usage) === null || _a === void 0 ? void 0 : _a.prompt_tokens,
        outputTokens: (_b = response === null || response === void 0 ? void 0 : response.usage) === null || _b === void 0 ? void 0 : _b.completion_tokens,
        totalTokens: (_c = response === null || response === void 0 ? void 0 : response.usage) === null || _c === void 0 ? void 0 : _c.total_tokens,
    };
    console.log('inputTokens: ', (_d = response === null || response === void 0 ? void 0 : response.usage) === null || _d === void 0 ? void 0 : _d.prompt_tokens);
    console.log('outputTokens: ', (_e = response === null || response === void 0 ? void 0 : response.usage) === null || _e === void 0 ? void 0 : _e.completion_tokens);
    console.log('totalTokens: ', (_f = response === null || response === void 0 ? void 0 : response.usage) === null || _f === void 0 ? void 0 : _f.total_tokens);
    return response.choices[0].message.content;
}
exports.describeWithGPT4 = describeWithGPT4;
//# sourceMappingURL=llmCalls.js.map