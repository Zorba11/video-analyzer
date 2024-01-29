import OpenAI from 'openai';
import fs from 'fs';
import sharp from 'sharp';
import dotenv from 'dotenv';
import { createCanvas } from 'canvas';
import { fabric } from 'fabric';
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create a Node canvas instance
// const canvas = createCanvas(800, 600);
// const fabricCanvas = new fabric.Canvas(canvas);
// const canvasWidth = 800;
// const canvasHeight = 600;
// canvas.setDimensions({ width: canvasWidth, height: canvasHeight });

function addImageToCanvas(canvas, imageUrl, left, top, width, height) {
  fabric.Image.fromURL(imageUrl, function(img) {
      img.set({
          left: left,
          top: top,
          scaleX: width / img.width,
          scaleY: height / img.height
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
    fit: 'inside',
    withoutEnlargement: true
    }) // Resize to 200x200px
    .jpeg({ quality: 50 }) // Compress the image to 50% quality
    .toBuffer();

  // Convert the compressed image to base64
  const base64Image = outputBuffer.toString('base64');

  return base64Image;
}

function saveBase64Image(base64Image, outputPath) {
  // Convert the base64 string back to binary data
  const binaryData = Buffer.from(base64Image, 'base64');

  // Write the binary data to a file
  fs.writeFileSync(outputPath, binaryData);

  console.log(`Image saved to ${outputPath}`);
}

async function createStoryboard(images, output) {
  // Load and resize all images
  const resizedImages = await Promise.all(
    images.map(image => sharp(image).resize(200, 200).toBuffer())
  );

  // Create a blank canvas
  const canvas = sharp({
    create: {
      width: 600,
      height: 400,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  });

  // Combine all images into a single image
  const combinedImage = await canvas.composite(
    resizedImages.map((image, index) => ({
      input: image,
      top: Math.floor(index / 3) * 200,
      left: (index % 3) * 200
    }))
  );

  // Save the combined image to a file
  await combinedImage.toFile(output);
}



async function describeImage(imagePath) {
  const base64Image = await compressAndConvertToBase64(imagePath);
  saveBase64Image(base64Image, 'output.jpg');

  createStoryboard([imagePath, imagePath, imagePath, imagePath, imagePath, imagePath], `output-story.jpg`);

  try {
    // const response = await openai.chat.completions.create({
    //   model: "gpt-4-vision-preview",
    //   messages: [
    //     {
    //       role: "system",
    //       content: `The following is a conversation with an AI assistant with vision. The assistant is helpful, creative, clever, and very friendly. The user will be sending
    //       image inputs that are coming from a surveillance camera. The assistant will be describing the image in a concise manner without loosing any important details.
    //       The assistant should particularly be able to extract valuable data from these images that can be used to make business decisions.
    //       `,
    //     },
    //     {
    //       role: "user",
    //       content: [
    //         { type: "text", text: "Decribe whats seen in the image? if its a parking lot, then tell me how many cars can be seen adn tell me the average price of the cars seen" },
    //         {
    //           type: "image_url",
    //           image_url: {
    //             "url": `data:image/jpeg;base64,${base64Image}`,
    //           },
    //         },
    //       ],
    //     },
    //   ],
    //   max_tokens: 1500,
    // }
    // );
    console.log("done!");
/**
 * "The image depicts an outdoor parking lot with snow patches on the ground, indicating cold weather conditions. There are approximately 22 cars visible in the parking lot. However, due to the low resolution and angle of the image, it's difficult to definitively identify the makes and models of all vehicles to provide an accurate average price.\n\nTo give a general idea, if this parking lot is in a region typical of a mix of economy and mid-range vehicles, average prices could range from $20,000 to $30,000 for new economy cars, and upwards for mid-range models. But without clearer details on the specific vehicles, this is quite a rough estimate. Please note that the value of used cars would differ significantly from these figures, depending on a multitude of factors including age, condition, mileage, and market demand."
 * 
 */
  } catch (error) {
    console.error("Error describing image:", error);
  }
}

// Example usage with a local image
describeImage("parking-lot-march.png");