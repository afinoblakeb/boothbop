import { storageGet, storageSet } from "./safeStorage";

export type BopFXId =
  | "original"
  | "spectralEcho"
  | "funhouse"
  | "cutoutChorus"
  | "mirrorBloom";

export interface BopFXCapabilities {
  nativePreview: boolean;
  faceLandmarks: boolean;
  personSegmentation: boolean;
  metalRendering: boolean;
  arFaceTracking: boolean;
  maximumTrackedFaces: number;
  trueDepthCamera: boolean;
  depthStream: boolean;
  effects: readonly BopFXId[];
}

export interface BopFXEffect {
  id: BopFXId;
  name: string;
  description: string;
  swatches: readonly string[];
  requiresFaceLandmarks: boolean;
  requiresPersonSegmentation: boolean;
}

export const BOPFX_EFFECTS: readonly BopFXEffect[] = [
  {
    id: "original",
    name: "Original",
    description: "The unaltered BoothBop camera.",
    swatches: ["#f4f5f5", "#202124"],
    requiresFaceLandmarks: false,
    requiresPersonSegmentation: false,
  },
  {
    id: "spectralEcho",
    name: "Spectral Echo",
    description: "Chromatic portrait copies phase through the loop.",
    swatches: ["#ff3b30", "#00c7be", "#ffd60a"],
    requiresFaceLandmarks: true,
    requiresPersonSegmentation: false,
  },
  {
    id: "funhouse",
    name: "Funhouse",
    description: "Smooth face-aware stretches and dimensional warps.",
    swatches: ["#ff375f", "#bf5af2", "#64d2ff"],
    requiresFaceLandmarks: true,
    requiresPersonSegmentation: false,
  },
  {
    id: "cutoutChorus",
    name: "Cutout Chorus",
    description: "Repeated silhouettes form a rhythmic composition.",
    swatches: ["#ff9f0a", "#30d158", "#0a84ff"],
    requiresFaceLandmarks: false,
    requiresPersonSegmentation: true,
  },
  {
    id: "mirrorBloom",
    name: "Mirror Bloom",
    description: "Face-centered reflections open around the portrait.",
    swatches: ["#f4f5f5", "#5e5ce6", "#ff2d55"],
    requiresFaceLandmarks: true,
    requiresPersonSegmentation: false,
  },
] as const;

const BOPFX_IDS = new Set<string>(BOPFX_EFFECTS.map(({ id }) => id));
const BOPFX_KEY = "bb.bopfx";

export function isBopFXId(value: unknown): value is BopFXId {
  return typeof value === "string" && BOPFX_IDS.has(value);
}

export function loadBopFX(): BopFXId {
  const stored = storageGet(BOPFX_KEY);
  return isBopFXId(stored) ? stored : "original";
}

export function saveBopFX(effect: BopFXId): void {
  storageSet(BOPFX_KEY, effect);
}

export function availableBopFXEffects(
  capabilities: BopFXCapabilities,
): readonly BopFXEffect[] {
  return BOPFX_EFFECTS.filter((effect) => {
    if (effect.id === "original") return true;
    if (!capabilities.effects.includes(effect.id)) return false;
    if (!capabilities.nativePreview || !capabilities.metalRendering)
      return false;
    if (effect.requiresFaceLandmarks && !capabilities.faceLandmarks)
      return false;
    if (effect.requiresPersonSegmentation && !capabilities.personSegmentation) {
      return false;
    }
    return true;
  });
}

/** A stable 0..<1 phase used to animate an effect across captured frames. */
export function bopFXPhase(frameIndex: number, frameCount: number): number {
  if (
    !Number.isFinite(frameIndex) ||
    !Number.isFinite(frameCount) ||
    frameIndex < 0 ||
    frameCount <= 0
  ) {
    return 0;
  }
  const count = Math.max(1, Math.floor(frameCount));
  return (Math.floor(frameIndex) % count) / count;
}
