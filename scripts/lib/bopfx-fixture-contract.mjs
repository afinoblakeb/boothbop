export const expectedBopFXEffects = [
  "original",
  "spectralEcho",
  "funhouse",
  "cutoutChorus",
  "mirrorBloom",
  "spinCycle",
];

export function pickBopFXSimulator(devices, requestedUdid) {
  const iPhones = devices.filter(({ name }) => name.startsWith("iPhone"));
  if (requestedUdid) {
    const requested = iPhones.find(({ udid }) => udid === requestedUdid);
    if (!requested) {
      throw new Error(
        `BOPFX_SIMULATOR_UDID ${requestedUdid} is not an available iPhone simulator`,
      );
    }
    return requested;
  }
  return (
    iPhones.find(({ state }) => state === "Booted") ??
    iPhones.find(({ name }) => name === "iPhone 17 Pro") ??
    iPhones[0]
  );
}

export function assertBopFXFixtureReport(report) {
  if (!Array.isArray(report)) {
    throw new Error("BopFX fixture report must be an array");
  }
  const byEffect = new Map(report.map((entry) => [entry?.effect, entry]));

  for (const effect of expectedBopFXEffects) {
    const entry = byEffect.get(effect);
    if (!entry) {
      throw new Error(`BopFX fixture is missing ${effect}`);
    }
    if (entry.rendered !== true) {
      throw new Error(`BopFX fixture failed to render ${effect}`);
    }
    if (typeof entry.recording !== "string" || entry.recording.length === 0) {
      throw new Error(`BopFX fixture is missing the ${effect} recording`);
    }
  }

  const livingStrip = byEffect.get("livingStrip");
  if (!livingStrip || livingStrip.rendered !== true) {
    throw new Error("BopFX fixture failed to render the Living Strip");
  }
  if (
    typeof livingStrip.livingStripRecording !== "string" ||
    livingStrip.livingStripRecording.length === 0
  ) {
    throw new Error("BopFX fixture is missing the living-strip recording");
  }
}
