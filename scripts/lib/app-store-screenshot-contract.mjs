export const APP_STORE_SCREENSHOT_DEVICES = [
  {
    displayType: "APP_IPHONE_67",
    label: "iphone-69",
    viewport: { width: 440, height: 956 },
    scale: 3,
    pixels: { width: 1320, height: 2868 },
  },
  {
    displayType: "APP_IPHONE_61",
    label: "iphone-63",
    viewport: { width: 393, height: 852 },
    scale: 3,
    pixels: { width: 1179, height: 2556 },
  },
  {
    displayType: "APP_IPHONE_55",
    label: "iphone-55",
    viewport: { width: 414, height: 736 },
    scale: 3,
    pixels: { width: 1242, height: 2208 },
  },
];

export const APP_STORE_SCREENSHOT_SCENES = [
  { id: "camera", fileName: "1-camera.png" },
  { id: "classic-strip", fileName: "2-classic-strip.png" },
  { id: "looks", fileName: "3-looks.png" },
  { id: "gif-boom", fileName: "4-gif-boom.png" },
  { id: "my-photos", fileName: "5-my-photos.png" },
];

export function expectedScreenshotCount() {
  return (
    APP_STORE_SCREENSHOT_DEVICES.length * APP_STORE_SCREENSHOT_SCENES.length
  );
}
