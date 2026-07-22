export function simulatorCameraPrivacyArgs(udid, bundleId, decision) {
  if (decision !== "grant" && decision !== "deny") {
    throw new Error("Camera privacy decision must be grant or deny.");
  }

  const action = decision === "deny" ? "revoke" : "grant";
  return ["simctl", "privacy", udid, action, "camera", bundleId];
}
