"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemPrompts = void 0;
var SystemPrompts;
(function (SystemPrompts) {
    SystemPrompts["ClockViewBlockedOrDetectLights"] = "Analyze the composite images (each consisting of 6 stitched surveillance photos) taken in chronological order from left to right. The time of each frame will be printed on them. The footage is of a digital clock that looks like a monitor.You should analyze and compare these sequential phots and provide a summary of the events that occurred. If any part of the view is blocked, indicate this by returning 'function_to_call: informBlockedView'. Additionally, detect changes in lighting within the scene. If the lights were turned off, include 'function_to_call: lightsOff' in the response. If the lights were turned on, include 'function_to_call: lightsOn'. Consider that the images will appear in grayscale when the lights are off and in color when the lights are on.";
})(SystemPrompts || (exports.SystemPrompts = SystemPrompts = {}));
//# sourceMappingURL=SystemPrompts.js.map