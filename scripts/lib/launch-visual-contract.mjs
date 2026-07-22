export function isBlackLaunchFrame(stats) {
  return stats.average < 12 && stats.brightRatio < 0.02;
}

export function isSimulatorBootFrameReady(stats) {
  return !isBlackLaunchFrame(stats) && stats.brightRatio >= 0.1;
}

export function assertNoSustainedBlackLaunch(deviceName, blackFrameCount) {
  if (blackFrameCount >= 2) {
    throw new Error(
      `${deviceName} rendered ${blackFrameCount} consecutive black frames during launch.`,
    );
  }
}

export function isBoothBopReadyFrame(stats) {
  const homeReady =
    stats.average >= 150 &&
    stats.standardDeviation >= 6 &&
    stats.brandOrangeRatio >= 0.003 &&
    stats.lightSurfaceRatio >= 0.35 &&
    stats.maxOrangeRowRatio >= 0.45;
  const cameraReady =
    stats.average >= 60 &&
    stats.standardDeviation >= 60 &&
    stats.brandOrangeRatio >= 0.004 &&
    stats.lightSurfaceRatio >= 0.2 &&
    stats.darkSurfaceRatio >= 0.25 &&
    stats.maxOrangeRowRatio >= 0.08;
  return homeReady || cameraReady;
}
