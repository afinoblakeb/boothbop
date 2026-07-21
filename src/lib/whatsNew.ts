export interface ReleaseAnnouncement {
  version: string;
  title: string;
  body: string;
}

const LAST_SEEN_RELEASE_KEY = "bb.lastSeenRelease";

const RELEASE_ANNOUNCEMENTS: Record<string, ReleaseAnnouncement> = {
  "0.0.4": {
    version: "0.0.4",
    title: "Sharing made social",
    body: "GIF animations now share as videos, so they work with Instagram and more.",
  },
};

export const CURRENT_RELEASE_ANNOUNCEMENT =
  RELEASE_ANNOUNCEMENTS[packageJson.version] ?? null;

export function loadReleaseAnnouncement(
  storage: Storage = localStorage,
): ReleaseAnnouncement | null {
  if (!CURRENT_RELEASE_ANNOUNCEMENT) return null;
  try {
    return storage.getItem(LAST_SEEN_RELEASE_KEY) ===
      CURRENT_RELEASE_ANNOUNCEMENT.version
      ? null
      : CURRENT_RELEASE_ANNOUNCEMENT;
  } catch {
    return CURRENT_RELEASE_ANNOUNCEMENT;
  }
}

export function dismissReleaseAnnouncement(
  storage: Storage = localStorage,
): void {
  if (!CURRENT_RELEASE_ANNOUNCEMENT) return;
  try {
    storage.setItem(
      LAST_SEEN_RELEASE_KEY,
      CURRENT_RELEASE_ANNOUNCEMENT.version,
    );
  } catch {
    // Dismissal still succeeds for this session when storage is unavailable.
  }
}
import packageJson from "../../package.json";
