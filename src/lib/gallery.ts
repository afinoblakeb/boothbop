// On-device private gallery backed by IndexedDB.
//
// Every completed booth session is stored locally as its raw photo blobs.
// Nothing is ever uploaded — this is purely the user's phone acting as private
// storage, and everything here can be deleted by the user at any time.

import { normalizeSessionStyle, type SessionStyle } from "./style";

export type { SessionStyle } from "./style";

export interface Session {
  id: string;
  createdAt: number;
  title?: string;
  favorite?: boolean;
  style?: SessionStyle;
  photos: Blob[]; // the four captured frames (JPEG)
}

const DB_NAME = "boothbop";
const STORE = "sessions";
const VERSION = 1;
export const SESSION_TITLE_MAX = 36;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Ask the browser to keep our data through storage pressure (best effort). */
export function requestPersistence() {
  navigator.storage?.persist?.().catch(() => {});
}

export async function saveSession(
  photos: Blob[],
  style?: SessionStyle,
): Promise<Session> {
  const normalizedStyle = normalizeSessionStyle(style);
  const session: Session = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    favorite: false,
    ...(normalizedStyle ? { style: normalizedStyle } : {}),
    photos,
  };
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction(STORE, "readwrite");
      t.objectStore(STORE).put(session);
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  } finally {
    db.close();
  }
  return session;
}

export async function listSessions(): Promise<Session[]> {
  const db = await openDB();
  try {
    const items = await new Promise<Session[]>((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result as Session[]);
      req.onerror = () => reject(req.error);
    });
    return items
      .map(normalizeSession)
      .sort(
        (a, b) =>
          Number(b.favorite) - Number(a.favorite) || b.createdAt - a.createdAt,
      );
  } finally {
    db.close();
  }
}

export async function updateSessionMeta(
  id: string,
  patch: Pick<Session, "title" | "favorite">,
): Promise<Session | null> {
  const db = await openDB();
  try {
    return await new Promise<Session | null>((resolve, reject) => {
      const t = db.transaction(STORE, "readwrite");
      const store = t.objectStore(STORE);
      const getReq = store.get(id);
      let next: Session | null = null;
      getReq.onsuccess = () => {
        const current = getReq.result as Session | undefined;
        if (!current) {
          resolve(null);
          return;
        }
        next = normalizeSession({
          ...current,
          ...(patch.title !== undefined
            ? { title: cleanSessionTitle(patch.title) }
            : {}),
          ...(patch.favorite !== undefined ? { favorite: patch.favorite } : {}),
        });
        store.put(next);
      };
      getReq.onerror = () => reject(getReq.error);
      t.oncomplete = () => resolve(next);
      t.onerror = () => reject(t.error);
    });
  } finally {
    db.close();
  }
}

export async function updateSessionPhotos(
  id: string,
  photos: Blob[],
): Promise<Session | null> {
  const db = await openDB();
  try {
    return await new Promise<Session | null>((resolve, reject) => {
      const t = db.transaction(STORE, "readwrite");
      const store = t.objectStore(STORE);
      const getReq = store.get(id);
      let next: Session | null = null;
      getReq.onsuccess = () => {
        const current = getReq.result as Session | undefined;
        if (!current) {
          resolve(null);
          return;
        }
        next = normalizeSession({ ...current, photos });
        store.put(next);
      };
      getReq.onerror = () => reject(getReq.error);
      t.oncomplete = () => resolve(next);
      t.onerror = () => reject(t.error);
    });
  } finally {
    db.close();
  }
}

export async function updateSessionStyle(
  id: string,
  style: SessionStyle,
): Promise<Session | null> {
  const db = await openDB();
  try {
    return await new Promise<Session | null>((resolve, reject) => {
      const t = db.transaction(STORE, "readwrite");
      const store = t.objectStore(STORE);
      const getReq = store.get(id);
      let next: Session | null = null;
      getReq.onsuccess = () => {
        const current = getReq.result as Session | undefined;
        if (!current) {
          resolve(null);
          return;
        }
        next = normalizeSession({
          ...current,
          style: normalizeSessionStyle(style),
        });
        store.put(next);
      };
      getReq.onerror = () => reject(getReq.error);
      t.oncomplete = () => resolve(next);
      t.onerror = () => reject(t.error);
    });
  } finally {
    db.close();
  }
}

export async function deleteSession(id: string): Promise<void> {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction(STORE, "readwrite");
      t.objectStore(STORE).delete(id);
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  } finally {
    db.close();
  }
}

export async function clearSessions(): Promise<void> {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction(STORE, "readwrite");
      t.objectStore(STORE).clear();
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  } finally {
    db.close();
  }
}

export function cleanSessionTitle(title: string): string {
  return title.replace(/\s+/g, " ").trim().slice(0, SESSION_TITLE_MAX);
}

function normalizeSession(session: Session): Session {
  const style = normalizeSessionStyle(session.style);
  return {
    ...session,
    title: cleanSessionTitle(session.title ?? ""),
    favorite: session.favorite === true,
    ...(style ? { style } : { style: undefined }),
  };
}

/** Encode a canvas frame to a Blob (defaults to compact JPEG for storage). */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/jpeg",
  quality = 0.85,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("encode failed"))),
      type,
      quality,
    );
  });
}

/** Load a stored photo blob back into a square canvas (for re-compositing). */
export function blobToCanvas(
  blob: Blob,
  size = 720,
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      canvas.getContext("2d")!.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}
