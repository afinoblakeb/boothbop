export function simulatorSourceFileName(sceneFileName) {
  return sceneFileName.replace(/\.png$/u, "-window.png");
}

export function officialDevicePlacement(pixels, crop) {
  const horizontalMargin = Math.round(pixels.width * 0.06);
  const headerBottom = Math.round(pixels.height * 0.14);
  const headerGap = Math.round(pixels.height * 0.012);
  const bottomMargin = Math.round(pixels.height * 0.012);
  const maxWidth = pixels.width - horizontalMargin * 2;
  const maxHeight = pixels.height - headerBottom - headerGap - bottomMargin;
  const scale = Math.min(maxWidth / crop.width, maxHeight / crop.height);
  const width = Math.round(crop.width * scale);
  const height = Math.round(crop.height * scale);

  return {
    left: Math.round((pixels.width - width) / 2),
    top: pixels.height - bottomMargin - height,
    width,
    height,
    headerBottom,
  };
}
