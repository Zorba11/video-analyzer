import { describeBaseScene, describeWithGPT4 } from './llmCalls';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { IFrameForLLM } from './Interfaces';
import {
  convertImgToBase64,
  createStoryboard,
  saveYUVBase64AsJPG,
} from './utils/imgHelpers';
import { executeAction } from './actions/actionsRoot';
import { SystemPrompts } from './SystemPrompts';
import { clearDirectory } from './utils/fileSysHelpers';
import { extractMediaAndTranscribe } from './utils/mediaExtractor';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
dotenv.config();

let storyBoardBuffer: string[] = [];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

const app = express();

app.use(
  cors({
    origin: '*',
  })
);
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

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

    await saveYUVBase64AsJPG(frames[0], 'baseScene.jpg');

    const sceneInBase64 = await convertImgToBase64('baseScene.jpg');

    // const description = await describeBaseScene(sceneInBase64, time);

    // console.log('description: ', description);

    // res.status(200).send(`Heres what I saw: ${description}`);
  } catch (error) {
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

    base64Images.forEach((frame: IFrameForLLM, index: number) => {
      // saveBase64AsJPG(base64Image, `output${index}.jpg`);
      saveYUVBase64AsJPG(frame, `images/output${frame.time}.jpg`);
    });

    // this will also save the image locally
    await createStoryboard(
      [
        { time: fTime1, imgName: 'images/output' + fTime1 + '.jpg' },
        { time: fTime2, imgName: 'images/output' + fTime2 + '.jpg' },
        { time: fTime3, imgName: 'images/output' + fTime3 + '.jpg' },
        { time: fTime4, imgName: 'images/output' + fTime4 + '.jpg' },
        { time: fTime5, imgName: 'images/output' + fTime5 + '.jpg' },
        { time: fTime6, imgName: 'images/output' + fTime6 + '.jpg' },
      ],
      storyBoardName
    );

    // const storyboardBase64 = await compressAndConvertToBase64(storyBoardName);
    // saveBase64AsJPG(
    //   storyboardBase64,
    //   'output-story-sequenced-api-COMPRESSED.jpg'
    // );

    const storyboardBase64 = await convertImgToBase64(storyBoardName);

    storyBoardBuffer.push(storyboardBase64);

    if (storyBoardBuffer.length >= 4) {
      const description = await describeWithGPT4(
        storyBoardBuffer,
        SystemPrompts.ClockViewBlockedOrDetectLights
      );

      if (description) {
        executeAction(description);

        storyBoardBuffer = [];
        clearDirectory('images');

        res.status(200).send(`Heres what I saw: ${description}`);
      } else {
        res.status(200).send(`No description was returned`);
      }
    } else {
      res.status(200).send(`Frames were added to the buffer`);
    }
  } catch (error) {
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

    const parentDirectory = path.dirname(__dirname);
    const absoluteFilePath = path.join(parentDirectory, req.file.path);
    console.log(absoluteFilePath);

    const fileNameWithoutExtension = path.basename(
      fileName,
      path.extname(fileName)
    );

    const outputFolderPath = path.join(
      parentDirectory,
      `extractions/${fileNameWithoutExtension}/`
    );

    extractMediaAndTranscribe(absoluteFilePath, outputFolderPath);
  } else {
    res.status(400).send('No video uploaded.');
  }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/video/:filename', (req, res) => {
  const range = req.headers.range;
  if (!range) {
    res.status(400).send('Requires Range header');
  }

  const filename = req.params.filename;
  const videoPath = `uploads/${filename}`;
  const videoSize = fs.statSync(videoPath).size;

  // parse Range
  // Example: "bytes=32324-"
  const CHUNK_SIZE = 10 ** 6; // 1MB
  const start = Number(range?.replace(/\D/g, ''));
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

  const videoStream = fs.createReadStream(videoPath, { start, end });

  videoStream.pipe(res);
});

app.get('/files', (req, res) => {
  // const directoryPath = path.join(__dirname, 'uploads');
  const directoryPath = 'uploads';

  fs.readdir(directoryPath, (err, files) => {
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
