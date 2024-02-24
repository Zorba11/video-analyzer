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
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config();
let storyBoardBuffer = [];
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${file.originalname}-${Date.now()}`);
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
    try {
        const base64Images = req.body.base64Images;
        const fTime1 = base64Images[0].time;
        const fTime2 = base64Images[1].time;
        const fTime3 = base64Images[2].time;
        const fTime4 = base64Images[3].time;
        const fTime5 = base64Images[4].time;
        const fTime6 = base64Images[5].time;
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
// Example usage with a local image
// describeImage('parking-lot-march.png');
const PORT = process.env.PORT || 3005;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
//# sourceMappingURL=index.js.map