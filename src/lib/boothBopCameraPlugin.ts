import { registerPlugin } from "@capacitor/core";

export interface NativeCameraFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
}

export interface NativePhoto {
  data: string;
  mimeType: string;
  width: number;
  height: number;
}

export interface BoothBopCameraPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  start(): Promise<{ width: number; height: number }>;
  setPreviewFrame(frame: NativeCameraFrame): Promise<{ visible: boolean }>;
  capture(): Promise<NativePhoto>;
  stop(): Promise<{ stopped: boolean }>;
}

export const BoothBopCamera =
  registerPlugin<BoothBopCameraPlugin>("BoothBopCamera");
