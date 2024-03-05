import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = require('twilio')(accountSid, authToken);

export async function sendBlockedViewAlert() {
  try {
    const message = await client.messages.create({
      body: 'Hey, Someone is blocking the clock view! You might wanna take a look.',
      from: process.env.TWILIO_PHONE_NUMBER,
      to: +13062412783,
    });

    console.log(message.sid);
  } catch (error) {
    console.error(error);
  }
}

export async function sendLightsONaLERT() {
  try {
    const message = await client.messages.create({
      body: 'Hey, Someone turned ON the lights! You might wanna take a look.',
      from: process.env.TWILIO_PHONE_NUMBER,
      to: +13062412783,
    });

    console.log(message.sid);
  } catch (error) {
    console.error(error);
  }
}

export async function sendLightsOFFaLERT() {
  try {
    const message = await client.messages.create({
      body: 'Hey, Someone SWitched the lights! You might wanna take a look.',
      from: process.env.TWILIO_PHONE_NUMBER,
      to: +13062412783,
    });

    console.log(message.sid);
  } catch (error) {
    console.error(error);
  }
}

export async function sendTextExtractionAlert(extractedText: string) {
  try {
    const message = await client.messages.create({
      body: 'Heres the text from the Sticky note: ' + extractedText,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: +13062412783,
    });

    console.log(message.sid);
  } catch (error) {
    console.error(error);
  }
}
