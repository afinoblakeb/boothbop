export function simulatorCameraPrivacyArgs(udid, bundleId, decision) {
  if (decision !== "grant" && decision !== "deny") {
    throw new Error("Camera privacy decision must be grant or deny.");
  }

  return ["simctl", "privacy", udid, decision, "camera", bundleId];
}
