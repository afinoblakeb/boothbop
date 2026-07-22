export function simulatorCameraGrantArgs(udid, bundleId) {
  return ["simctl", "privacy", udid, "grant", "camera", bundleId];
}
