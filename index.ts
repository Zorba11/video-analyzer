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
import { SystemPrompts } from './SystemPrompts';
import { clearDirectory } from './utils/fileSysHelpers';
dotenv.config();

let storyBoardBuffer: string[] = [];

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// a ping pong endpoint
app.get('/ping', (req, res) => {
  return res.send('pong');
});

app.post('/describeBaseScene', async (req, res) => {
  try {
    const frames = req.body.frames;
    const time = frames[0].time;
    const frWidth = frames[0].width;
    const frHeight = frames[0].height;

    await saveYUVBase64AsJPG(frames[0], 'baseScene.jpg');

    const sceneInBase64 = await convertImgToBase64('baseScene.jpg');

    const description = await describeBaseScene(sceneInBase64, time);

    console.log('description: ', description);

    res.status(200).send(`Heres what I saw: ${description}`);
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

    if (storyBoardBuffer.length === 4) {
      const description = await describeWithGPT4(
        storyBoardBuffer,
        SystemPrompts.ClockViewBlockedOrDetectLights
      );

      storyBoardBuffer = [];
      clearDirectory('images');

      res.status(200).send(`Heres what I saw: ${description}`);
    } else {
      res.status(200).send(`Frames were added to the buffer`);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while processing the image');
  }
});

// Example usage with a local image
// describeImage('parking-lot-march.png');

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
