import {
  sendBlockedViewAlert,
  sendLightsOFFaLERT,
  sendLightsONaLERT,
  sendTextExtractionAlert,
} from './smsActions';

export function executeAction(description: string) {
  try {
    console.log('executing action...');

    let matchResult = description.match(/```json\n([\s\S]*?)\n```/);

    let actions;

    if (matchResult) {
      actions = JSON.parse(matchResult[1]);
    }

    if (!actions) {
      return 'No action to execute';
    }

    for (let i = 0; i < actions.length; i++) {
      if (actions[i].function_to_call === 'informBlockedView') {
        sendBlockedViewAlert();
        return;
      }

      if (actions[i].function_to_call === 'lightsOff') {
        sendLightsOFFaLERT();
      }

      if (actions[i].function_to_call === 'lightsOn') {
        sendLightsONaLERT();
      }

      if (actions[i].function_to_call === 'extractText') {
        const extractedText = actions[i].extractedText;
        sendTextExtractionAlert(extractedText);
      }
    }
  } catch (error) {
    console.error(error);
  }
}
