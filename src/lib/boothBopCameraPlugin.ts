import { registerPlugin } from "@capacitor/core";

export interface NativeCameraFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
}

export interface NativePhoto {
  path: string;
  mimeType: string;
  width: number;
  height: number;
  mirrored: boolean;
}

export interface NativeCameraStart {
  width: number;
  height: number;
  warmupPath?: string;
}

export interface BoothBopCameraPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  start(): Promise<NativeCameraStart>;
  setPreviewFrame(frame: NativeCameraFrame): Promise<{ visible: boolean }>;
  capture(options: { size: number }): Promise<NativePhoto>;
  release(options: { path: string }): Promise<{ released: boolean }>;
  stop(): Promise<{ stopped: boolean }>;
}

export const BoothBopCamera =
  registerPlugin<BoothBopCameraPlugin>("BoothBopCamera");
