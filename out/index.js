"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const llmCalls_1 = require("./llmCalls");
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const imgHelpers_1 = require("./utils/imgHelpers");
const actionsRoot_1 = require("./actions/actionsRoot");
const SystemPrompts_1 = require("./SystemPrompts");
const fileSysHelpers_1 = require("./utils/fileSysHelpers");
const mediaExtractor_1 = require("./utils/mediaExtractor");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const insightsEngine_1 = require("./utils/insightsEngine");
const dbFunctions_1 = require("./db/dbFunctions");
const embeddings_1 = require("./apis/embeddings");
const textLLMApis_1 = require("./apis/textLLMApis");
dotenv_1.default.config();
let storyBoardBuffer = [];
let phoneNumber = '';
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});
const upload = (0, multer_1.default)({ storage });
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: '*',
}));
app.use(body_parser_1.default.json({ limit: '50mb' }));
app.use(body_parser_1.default.urlencoded({ limit: '50mb', extended: true }));
// a ping pong endpoint
app.get('/ping', (req, res) => {
    return res.send('pong');
});
app.post('/describeBaseScene', async (req, res) => {
    try {
        const frames = req.body.frames;
        // const time = frames[0].time;
        // const frWidth = frames[0].width;
        // const frHeight = frames[0].height;
        await (0, imgHelpers_1.saveYUVBase64AsJPG)(frames[0], 'baseScene.jpg');
        const sceneInBase64 = await (0, imgHelpers_1.convertImgToBase64)('baseScene.jpg');
        // const description = await describeBaseScene(sceneInBase64, time);
        // console.log('description: ', description);
        // res.status(200).send(`Heres what I saw: ${description}`);
    }
    catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while processing the image');
    }
});
app.post('/uploadFrames', async (req, res) => {
    var _a, _b, _c, _d, _e, _f;
    try {
        const base64Images = req.body.base64Images;
        const fTime1 = (_a = base64Images[0]) === null || _a === void 0 ? void 0 : _a.time;
        const fTime2 = (_b = base64Images[1]) === null || _b === void 0 ? void 0 : _b.time;
        const fTime3 = (_c = base64Images[2]) === null || _c === void 0 ? void 0 : _c.time;
        const fTime4 = (_d = base64Images[3]) === null || _d === void 0 ? void 0 : _d.time;
        const fTime5 = (_e = base64Images[4]) === null || _e === void 0 ? void 0 : _e.time;
        const fTime6 = (_f = base64Images[5]) === null || _f === void 0 ? void 0 : _f.time;
        const storyBoardName = `storyboards/output-story-sequenced-${fTime1}.jpg`;
        if (!base64Images || base64Images.length !== 6) {
            return res.status(400).send('Exactly 6 images are required');
        }
        base64Images.forEach((frame, index) => {
            // saveBase64AsJPG(base64Image, `output${index}.jpg`);
            (0, imgHelpers_1.saveYUVBase64AsJPG)(frame, `images/output${frame.time}.jpg`);
        });
        // this will also save the image locally
        await (0, imgHelpers_1.createStoryboard)([
            { time: fTime1, imgName: 'images/output' + fTime1 + '.jpg' },
            { time: fTime2, imgName: 'images/output' + fTime2 + '.jpg' },
            { time: fTime3, imgName: 'images/output' + fTime3 + '.jpg' },
            { time: fTime4, imgName: 'images/output' + fTime4 + '.jpg' },
            { time: fTime5, imgName: 'images/output' + fTime5 + '.jpg' },
            { time: fTime6, imgName: 'images/output' + fTime6 + '.jpg' },
        ], storyBoardName);
        // const storyboardBase64 = await compressAndConvertToBase64(storyBoardName);
        // saveBase64AsJPG(
        //   storyboardBase64,
        //   'output-story-sequenced-api-COMPRESSED.jpg'
        // );
        const storyboardBase64 = await (0, imgHelpers_1.convertImgToBase64)(storyBoardName);
        storyBoardBuffer.push(storyboardBase64);
        if (storyBoardBuffer.length >= 4) {
            const description = await (0, llmCalls_1.describeWithGPT4)(storyBoardBuffer, SystemPrompts_1.SystemPrompts.ClockViewBlockedOrDetectLights);
            if (description) {
                (0, actionsRoot_1.executeAction)(description);
                storyBoardBuffer = [];
                (0, fileSysHelpers_1.clearDirectory)('images');
                res.status(200).send(`Heres what I saw: ${description}`);
            }
            else {
                res.status(200).send(`No description was returned`);
            }
        }
        else {
            res.status(200).send(`Frames were added to the buffer`);
        }
    }
    catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while processing the image');
    }
});
// video upload
app.post('/upload', upload.single('video'), (req, res) => {
    if (req.file) {
        console.log('req.file: ', req.file);
        const fileName = req.file.filename;
        console.log('filePath: ', fileName);
        res.json({
            filePath: fileName,
        });
        const parentDirectory = path_1.default.dirname(__dirname);
        const absoluteFilePath = path_1.default.join(parentDirectory, req.file.path);
        console.log(absoluteFilePath);
        const fileNameWithoutExtension = path_1.default.basename(fileName, path_1.default.extname(fileName));
        const outputFolderPath = path_1.default.join(parentDirectory, `extractions/${fileNameWithoutExtension}/`);
        res.status(200).send('Video uploaded');
        (0, mediaExtractor_1.extractMediaAndTranscribe)(absoluteFilePath, outputFolderPath)
            .then(() => (0, insightsEngine_1.createAudioVideoEmbeddings)(outputFolderPath, fileName))
            .catch((error) => {
            console.error('Failed to extract media and transcribe:', error);
        });
    }
    else {
        res.status(400).send('No video uploaded.');
    }
});
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, 'uploads')));
app.get('/video/:filename', (req, res) => {
    const range = req.headers.range;
    if (!range) {
        res.status(400).send('Requires Range header');
    }
    const filename = req.params.filename;
    const videoPath = `uploads/${filename}`;
    const videoSize = fs_1.default.statSync(videoPath).size;
    // parse Range
    // Example: "bytes=32324-"
    const CHUNK_SIZE = 10 ** 6; // 1MB
    const start = Number(range === null || range === void 0 ? void 0 : range.replace(/\D/g, ''));
    const end = Math.min(start + CHUNK_SIZE, videoSize - 1);
    const contentLength = end - start + 1;
    const headers = {
        'Content-Range': `bytes ${start}-${end}/${videoSize}`,
        'Accept-Range': 'bytes',
        'Content-Length': contentLength,
        'Content-Type': 'video/mp4',
    };
    // let the browser know that we are sending a partial content
    res.writeHead(206, headers);
    const videoStream = fs_1.default.createReadStream(videoPath, { start, end });
    videoStream.pipe(res);
});
app.get('/files', (req, res) => {
    // const directoryPath = path.join(__dirname, 'uploads');
    const directoryPath = 'uploads';
    fs_1.default.readdir(directoryPath, (err, files) => {
        if (err) {
            return res.status(500).send('Unable to scan directory: ' + err);
        }
        res.send(files);
    });
});
app.post('/improve-prompt', async (req, res) => {
    const prompt = req.body.prompt;
    if (!prompt) {
        return res.status(400).send('No prompt provided');
    }
    const improvedPrompt = await (0, textLLMApis_1.askGPT4)(SystemPrompts_1.SystemPrompts.ImprovePrompt, prompt);
    res.status(200).send(improvedPrompt);
});
app.post('/talk-to-gpt', async (req, res) => {
    const prompt = req.body.prompt;
    if (!prompt) {
        return res.status(400).send('No prompt provided');
    }
    // ask gpt
    // pipe the result to text to speech api
    // send the audio file back to the client
    const gptResponse = await (0, textLLMApis_1.askGPT4)(SystemPrompts_1.SystemPrompts.TalkToGPT, prompt, 'gpt-3.5-turbo-0125');
    const audioBuffer = await (0, textLLMApis_1.generateSpeech)(gptResponse ? gptResponse : '');
    const buffer = Buffer.from(audioBuffer);
    res.writeHead(200, {
        'Content-Type': 'audio/mp3',
        'Content-Length': buffer.length,
    });
    const stream = require('stream');
    const readableStream = new stream.PassThrough();
    readableStream.end(buffer);
    readableStream.pipe(res);
});
app.post('/retrieve-chat', async (req, res) => {
    const fileName = req.body.fileName;
    if (!fileName) {
        return res.status(400).send('No filename provided');
    }
    // retrieve chat from db
    const videoId = await (0, dbFunctions_1.getVideoIdByFilename)(fileName);
    const chatMessages = await (0, dbFunctions_1.retrieveChat)(videoId ? videoId[0] : 0);
    const response = chatMessages === null || chatMessages === void 0 ? void 0 : chatMessages.map((chatMessage) => ({
        sender: chatMessage.sender,
        text: chatMessage.message,
        id: chatMessage.video_id,
    }));
    res.status(200).send(response);
    const videoSummaryExist = await (0, dbFunctions_1.checkVideoSummaryExist)(videoId ? videoId[0] : 0);
    if (!videoSummaryExist) {
        // summarize the audio and video
        const videoSummary = await (0, dbFunctions_1.summarizeAudioVideoFrames)(videoId ? videoId[0] : 0);
        if (videoSummary) {
            // save the video summary to the db
            await (0, dbFunctions_1.storeVideoSummaryInDB)(videoId ? videoId[0] : 0, videoSummary);
        }
    }
});
app.post('/chat', async (req, res) => {
    const videoId = req.body.videoId;
    const sender = req.body.sender;
    const userQuery = req.body.text;
    if (!videoId || !userQuery) {
        return res.status(400).send('No videoId or message provided');
    }
    const gptResponse = await (0, textLLMApis_1.askGPT4)(SystemPrompts_1.DecideHowToProcessPrompt, userQuery);
    if (gptResponse) {
        const aiResponse = await findDecisionAndExecute(gptResponse, videoId, userQuery);
        res.status(200).send({ sender: 'AI', text: aiResponse });
    }
});
async function findDecisionAndExecute(gptMsg, videoId, userQuery) {
    if (gptMsg.includes('function_to_call: getSummarizedVideoText')) {
        // getVideoSummaryAndAIResponse
        const videoSummary = await (0, dbFunctions_1.getAudioSummaryByVideoId)(videoId);
        if (videoSummary) {
            const userPrompt = `This was the user query${userQuery}.Here is the summarized video text: ${videoSummary}`;
            const aiResponseWithSummary = await (0, textLLMApis_1.askGPT4)(SystemPrompts_1.VideoAIMainChatbotPrompt, userPrompt);
            return aiResponseWithSummary;
        }
    }
    if (gptMsg.includes('"function_to_call": "queryAudio"')) {
        console.log('queryAudio');
        // vectorize the message and do a similarity search
        const embedding = await (0, embeddings_1.createEmbeddings)(userQuery);
        if (embedding) {
            // const result = findSimilarItems(embedding.data[0].embedding as number[]);
            const result = await (0, dbFunctions_1.searchSequence)(videoId, embedding.data[0].embedding);
            if (result) {
                const startTimes = result.map((item) => item.start_time);
                const userPrompt = `This was the user quer: ${userQuery}.Here are the start times for word sequence: ${startTimes}`;
                const aiResponse = await (0, textLLMApis_1.askGPT4)(SystemPrompts_1.DeliverTimeStampsPromptAudio, userPrompt);
                return aiResponse;
            }
        }
    }
    if (gptMsg.includes('function_to_call: queryVideo')) {
        console.log('queryVideo');
        // vectorize the message and do a similarity search
        const embedding = await (0, embeddings_1.createEmbeddings)(userQuery);
        if (embedding) {
            const result = await (0, dbFunctions_1.searchThroughFrames)(videoId, embedding.data[0].embedding);
            if (result) {
                const userPrompt = `This was the user query${userQuery}.Here are the information about the user queried frames: ${JSON.stringify(result)}`;
                const aiResponse = await (0, textLLMApis_1.askGPT4)(SystemPrompts_1.DeliverTimeStampsPromptVideo, userPrompt);
                return aiResponse;
            }
        }
    }
}
// Example usage with a local image
// describeImage('parking-lot-march.png');
const PORT = process.env.PORT || 3005;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
//# sourceMappingURL=index.js.map