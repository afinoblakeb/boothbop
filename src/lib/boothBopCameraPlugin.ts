import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";

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
  generation: number;
  warmupPath?: string;
}

export interface NativeCameraStateChange {
  state: "interrupted" | "failed";
  message: string;
  generation: number;
}

export interface BoothBopCameraPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  start(): Promise<NativeCameraStart>;
  setPreviewFrame(frame: NativeCameraFrame): Promise<{ visible: boolean }>;
  capture(options: { size: number }): Promise<NativePhoto>;
  release(options: { path: string }): Promise<{ released: boolean }>;
  stop(): Promise<{ stopped: boolean }>;
  addListener(
    eventName: "stateChanged",
    listenerFunc: (event: NativeCameraStateChange) => void,
  ): Promise<PluginListenerHandle>;
}

export const BoothBopCamera =
  registerPlugin<BoothBopCameraPlugin>("BoothBopCamera");
