export function assertNoBlackLaunchFrame(deviceName, stats) {
  if (stats.average < 12 && stats.brightRatio < 0.02) {
    throw new Error(
      `${deviceName} rendered a black frame during launch: average luminance ${stats.average.toFixed(2)}, bright ratio ${(stats.brightRatio * 100).toFixed(2)}%.`,
    );
  }
}

export function isBoothBopHomeFrame(stats) {
  return (
    stats.average >= 150 &&
    stats.standardDeviation >= 6 &&
    stats.brandOrangeRatio >= 0.003 &&
    stats.lightSurfaceRatio >= 0.35 &&
    stats.maxOrangeRowRatio >= 0.45
  );
}
