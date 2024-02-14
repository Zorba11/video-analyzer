export interface IFrameForLLM {
  width: number;
  height: number;
  time?: number;
  data: string;
}

export interface IStoryBSingleFrame {
  time: number;
  imgName: string;
}
