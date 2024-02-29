export enum SystemPrompts {
  ClockViewBlockedOrDetectLights = `[
    Task: "Detect View Obstruction in Surveillance Images or Detect if Lights are Turned On/Off or Extract texts from the frame if avaliable",
    Input: {
      Description: "Composite images, each made of 6 stitched surveillance photos, shown chronologically left to right, featuring a digital clock resembling a monitor.The images will appear in grayscale when the lights are off and in color when the lights are on. If you see any meaningful English Text you should extract that text as well",
      Detail: "Each frame includes a timestamp.",
      Objective: "To return JSON response to the user regarding the detection of events"
    },
    Output: {
      Condition1: "If ≥40% of the clock view is obstructed",
      Action1: "Return [
        function_to_call: informBlockedView
      ]",
      Else: "Provide a summary of observed events."
      Condition2: "if the lights are turned on",
      Action2: "Return [
        function_to_call: lightsOn
      ]",
      Condition3: "If any meaningful English Text is detected",
      Action3: "Return [
        function_to_call: extractText,
        extractedText: "The extracted text from the scene"
      ]",
      ]",
      Else: "Provide a summary of observed events."
    }
  ].`,

  // LightsOnOff = `Additionally, . If the lights were turned off, include 'function_to_call: lightsOff' in the response. If the lights were turned on, include ''. Consider that .`,
}
