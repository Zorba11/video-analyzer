import OpenAI from 'openai';
import fs from 'fs';
import sharp from 'sharp';
import { createCanvas, ImageData } from 'canvas';
import yuvBuffer from 'yuv-buffer';
import jpeg from 'jpeg-js';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// a ping pong endpoint
app.get('/ping', (req, res) => {
  return res.send('pong');
});

app.post('/uploadFrames', async (req, res) => {
  try {
    const base64Images = req.body.base64Images;
    const storyBoardName = 'output-story-sequenced-api.jpg';

    if (!base64Images || base64Images.length !== 6) {
      return res.status(400).send('Exactly 6 images are required');
    }

    base64Images.forEach((frame, index) => {
      // saveBase64AsJPG(base64Image, `output${index}.jpg`);
      saveYUVBase64AsJPG(frame, `output${index}.jpg`);
    });

    // this will also save the image locally
    await createStoryboard(
      [
        `output0.jpg`,
        `output1.jpg`,
        `output2.jpg`,
        `output3.jpg`,
        `output4.jpg`,
        `output5.jpg`,
      ],
      storyBoardName
    );

    // const storyboardBase64 = await compressAndConvertToBase64(storyBoardName);
    // saveBase64AsJPG(
    //   storyboardBase64,
    //   'output-story-sequenced-api-COMPRESSED.jpg'
    // );

    const storyboardBase64 = await convertImgToBase64(storyBoardName);

    const description = await describeWithGPT4(storyboardBase64);

    res.status(200).send(`Heres what I saw: ${description}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while processing the image');
  }
});

// Create a Node canvas instance
// const canvas = createCanvas(800, 600);
// const fabricCanvas = new fabric.Canvas(canvas);
// const canvasWidth = 800;
// const canvasHeight = 600;
// canvas.setDimensions({ width: canvasWidth, height: canvasHeight });

function addImageToCanvas(canvas, imageUrl, left, top, width, height) {
  fabric.Image.fromURL(imageUrl, function (img) {
    img.set({
      left: left,
      top: top,
      scaleX: width / img.width,
      scaleY: height / img.height,
    });
    canvas.add(img);
  });
}

function imageToBase64(path) {
  const image = fs.readFileSync(path);
  return image.toString('base64');
}

async function compressAndConvertToBase64(imagePath) {
  // Compress the image
  const outputBuffer = await sharp(imagePath)
    .resize(250, 250, {
      fit: 'contain',
      withoutEnlargement: true,
    }) // Resize to 200x200px
    .jpeg({ quality: 90 }) // Compress the image to 50% quality
    .toBuffer();

  // Convert the compressed image to base64
  const base64Image = outputBuffer.toString('base64');

  return base64Image;
}

function convertImgToBase64(imagePath) {
  try {
    // Read the image file into a Buffer
    const imageBuffer = fs.readFileSync(imagePath);

    // Convert the Buffer to a base64 string
    const base64Image = imageBuffer.toString('base64');

    return base64Image;
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
}

async function saveYUVBase64AsJPG(frame, outputPath) {
  // const yPlaneSize = frame?.width * frame?.height;

  const width = frame?.width;
  const height = frame?.height;

  const base64Frame = frame?.data;
  const buffer = Buffer.from(base64Frame, 'base64');
  const rawDataView = Uint8Array.from(buffer);

  const rgbaData = new Uint8ClampedArray(width * height * 4);

  const yPlane = rawDataView.subarray(0, width * height);
  const uPlane = rawDataView.subarray(
    width * height,
    width * height + (width / 2) * (height / 2)
  );
  const vPlane = rawDataView.subarray(
    width * height + (width / 2) * (height / 2),
    rawDataView.length
  );
  // this conversion is only good for YUV I420 format
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const yIndex = j * width + i;
      const uvIndex =
        Math.floor(j / 2) * Math.floor(width / 2) + Math.floor(i / 2);

      const y = yPlane[yIndex];
      const u = uPlane[uvIndex];
      const v = vPlane[uvIndex];

      const [r, g, b, a] = yuvToRgba(y, u, v);

      rgbaData[yIndex * 4] = r;
      rgbaData[yIndex * 4 + 1] = g;
      rgbaData[yIndex * 4 + 2] = b;
      rgbaData[yIndex * 4 + 3] = a;
    }
  }

  // Create the image using the sharp library
  await sharp(rgbaData, {
    raw: {
      width: frame.width,
      height: frame.height,
      channels: 4,
    },
  })
    .jpeg()
    .toFile(outputPath);

  // const imageData = new ImageData(rgbaData, frame.width, frame.height);

  // const canvas = createCanvas(frame.width, frame.height);
  // const ctx = canvas.getContext('2d');
  // ctx?.putImageData(imageData, 0, 0);

  // // Convert the canvas to a Buffer
  // const canvasBuffer = canvas.toBuffer('image/jpeg');

  // fs.writeFileSync(outputPath, canvasBuffer);

  // canvas = undefined;
}

function yuvToRgba(y, u, v) {
  const r = y + 1.13983 * (v - 128);
  const g = y - 0.39465 * (u - 128) - 0.5806 * (v - 128);
  const b = y + 2.03211 * (u - 128);

  return [r, g, b, 255]; // Alpha channel is always 255
}

function saveBase64AsJPG(base64Image, outputPath) {
  // Convert the base64 string back to binary data
  const binaryData = Buffer.from(base64Image, 'base64');

  // Write the binary data to a file
  fs.writeFileSync(outputPath, binaryData);

  // console.log(`Image saved to ${outputPath}`);
}

async function createTextImage(text, width, height) {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');

  context.font = '30px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = 'white'; // Set text color to blue
  context.fillText(text, width / 2, height / 2);

  return canvas.toBuffer();
}

async function createStoryboard(images, output) {
  try {
    const gap = 5;
    const timestampHeight = 50;

    // Load and resize all images, and add a timestamp to each image
    const processedImages = await Promise.all(
      images.map(async (image, index) => {
        const img = await sharp(image).resize(200, 200);
        const timestamp = await createTextImage(
          `Frame ${index + 1}`,
          200,
          timestampHeight
        );

        return img
          .composite([
            { input: timestamp, top: 200 - timestampHeight, left: 0 },
          ])
          .toBuffer();
      })
    );

    // Create a blank canvas
    const canvas = sharp({
      create: {
        width: 3 * 200 + 2 * gap,
        height: 2 * 200 + timestampHeight + gap,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    });

    // Combine all images into a single image
    const combinedImage = await canvas.composite(
      processedImages.map((image, index) => ({
        input: image,
        top: Math.floor(index / 3) * (200 + timestampHeight + gap),
        left: (index % 3) * (200 + gap),
      }))
    );

    // Save the combined image to a file
    await combinedImage.toFile(output);

    // const combinedImageBuffer = await canvas
    //   .composite(
    //     processedImages.map((image, index) => ({
    //       input: image,
    //       top: Math.floor(index / 3) * (200 + timestampHeight + gap),
    //       left: (index % 3) * (200 + gap),
    //     }))
    //   )
    //   .toBuffer();

    // return combinedImageBuffer.toString('base64');
  } catch (error) {
    console.error('Error creating storyboard:', error);
  }
}

async function describeImage(imagePath) {
  // const base64Image = await compressAndConvertToBase64(imagePath);
  // saveBase64Image(base64Image, 'output.jpg');

  const storyBoardName = 'output-story-sequenced.jpg';

  // const singleImgBase64 = await compressAndConvertToBase64(imagePath);

  const singleImgBase64 = await convertImgToBase64(imagePath);

  // base64 storyboard image
  await createStoryboard(
    [imagePath, imagePath, imagePath, imagePath, imagePath, imagePath],
    `${storyBoardName}`
  );

  const storyboardBase64 = await compressAndConvertToBase64(storyBoardName);
  // const storyboardBase64 = await convertImageToBase64(storyBoardName);
  // convert storyboard to base64
  // base64 storyboard image sample:
  saveBase64AsJPG(storyboardBase64, 'output-story-sequenced-COMPRESSED.jpg');

  try {
    // await describeWithGPT4(storyboardBase64);
    console.log('done!');
    /**
"The image displays six frames of a parking lot covered with snow. The angle and coverage of each frame seem consistent, suggesting the frames were taken over a short span of time. Each frame shows the same portion of the parking lot, filled with various cars parked in rows. On average, each frame contains approximately 50 cars, give or take a few due to the resolution and angle not allowing an exact count of partially visible vehicles around the edges.\n\nDetermining the average price of the cars visible is quite challenging due to the image quality and the lack of distinctive visual details that would identify specific makes or models allowing for a price estimate. Additionally, without knowing the model year, condition, or specific version of the vehicles, providing an average price would be highly speculative.\n\nIf detailed information about each vehicle's make, model, and condition was available, one could reference current automotive valuation sources to estimate an average price. However, this would still be a rough estimate given the variability of vehicle prices based on these factors."
     *
     */
  } catch (error) {
    console.error('Error describing image:', error);
  }
}

async function describeWithGPT4(storyboardBase64) {
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
          Find useful informations like if the image is of a parking lot, tell me what color the cars are, how many cars are there, and what is the average price of the cars.
          Your analysis will be utilized for ongoing operational enhancements.
          `,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Decribe whats seen in the image? if its a parking lot, then tell me how many cars can be seen adn tell me the average price of the cars seen',
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
    inputTokens: response.usage.prompt_tokens,
    outputTokens: response.usage.completion_tokens,
    totalTokens: response.usage.total_tokens,
  };

  console.log('inputTokens: ', response.usage.prompt_tokens);
  console.log('outputTokens: ', response.usage.completion_tokens);
  console.log('totalTokens: ', response.usage.total_tokens);

  return response.choices[0].message.content;
}

// Example usage with a local image
// describeImage('parking-lot-march.png');

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));



