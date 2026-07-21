export function isBlackLaunchFrame(stats) {
  return stats.average < 12 && stats.brightRatio < 0.02;
}

export function assertNoSustainedBlackLaunch(deviceName, blackFrameCount) {
  if (blackFrameCount >= 2) {
    throw new Error(
      `${deviceName} rendered ${blackFrameCount} consecutive black frames during launch.`,
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
