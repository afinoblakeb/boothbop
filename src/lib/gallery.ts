// Private on-device gallery backed by IndexedDB. Metadata and small covers live
// separately from master photos so opening My Photos does not clone every
// full-resolution session into memory.
import { configureHighQualityScaling } from "./filter";

export interface Session {
  id: string;
  createdAt: number;
  photos: Blob[];
}

export interface SessionSummary {
  id: string;
  createdAt: number;
  cover: Blob;
}

interface PhotoRecord {
  id: string;
  photos: Blob[];
}

const DB_NAME = "boothbop";
const LEGACY_STORE = "sessions";
const META_STORE = "sessionMeta";
const PHOTOS_STORE = "sessionPhotos";
const VERSION = 2;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      const transaction = request.transaction!;
      const metadata = db.objectStoreNames.contains(META_STORE)
        ? transaction.objectStore(META_STORE)
        : db.createObjectStore(META_STORE, { keyPath: "id" });
      const photos = db.objectStoreNames.contains(PHOTOS_STORE)
        ? transaction.objectStore(PHOTOS_STORE)
        : db.createObjectStore(PHOTOS_STORE, { keyPath: "id" });

      if (event.oldVersion < 2 && db.objectStoreNames.contains(LEGACY_STORE)) {
        const legacy = transaction.objectStore(LEGACY_STORE);
        const cursor = legacy.openCursor();
        cursor.onsuccess = () => {
          const row = cursor.result;
          if (!row) {
            legacy.clear();
            return;
          }
          const session = row.value as Session;
          metadata.put({
            id: session.id,
            createdAt: session.createdAt,
            cover: session.photos[0] ?? new Blob(),
          } satisfies SessionSummary);
          photos.put({
            id: session.id,
            photos: session.photos,
          } satisfies PhotoRecord);
          row.continue();
        };
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Ask the browser to keep our data through storage pressure (best effort). */
export function requestPersistence(): void {
  navigator.storage?.persist?.().catch(() => {});
}

export async function saveSession(
  photos: Blob[],
  cover: Blob = photos[0] ?? new Blob(),
): Promise<Session> {
  const session: Session = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    photos,
  };
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(
        [META_STORE, PHOTOS_STORE],
        "readwrite",
      );
      transaction.objectStore(META_STORE).put({
        id: session.id,
        createdAt: session.createdAt,
        cover,
      } satisfies SessionSummary);
      transaction.objectStore(PHOTOS_STORE).put({
        id: session.id,
        photos,
      } satisfies PhotoRecord);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
  return session;
}

export async function loadSession(id: string): Promise<Session> {
  const db = await openDB();
  try {
    return await new Promise<Session>((resolve, reject) => {
      const transaction = db.transaction(
        [META_STORE, PHOTOS_STORE],
        "readonly",
      );
      const metadataRequest = transaction.objectStore(META_STORE).get(id);
      const photosRequest = transaction.objectStore(PHOTOS_STORE).get(id);
      transaction.oncomplete = () => {
        const metadata = metadataRequest.result as SessionSummary | undefined;
        const photoRecord = photosRequest.result as PhotoRecord | undefined;
        if (!metadata || !photoRecord) {
          reject(new Error("Session not found"));
          return;
        }
        resolve({
          id: metadata.id,
          createdAt: metadata.createdAt,
          photos: photoRecord.photos,
        });
      };
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

/** Replace masters and optionally refresh the cover after retaking photo one. */
export async function updateSessionPhotos(
  id: string,
  photos: Blob[],
  cover?: Blob,
): Promise<Session> {
  const db = await openDB();
  try {
    return await new Promise<Session>((resolve, reject) => {
      const transaction = db.transaction(
        [META_STORE, PHOTOS_STORE],
        "readwrite",
      );
      const metadataStore = transaction.objectStore(META_STORE);
      const metadataRequest = metadataStore.get(id);
      let updated: Session | null = null;

      metadataRequest.onsuccess = () => {
        const metadata = metadataRequest.result as SessionSummary | undefined;
        if (!metadata) {
          transaction.abort();
          reject(new Error("Session not found"));
          return;
        }
        if (cover) metadataStore.put({ ...metadata, cover });
        transaction.objectStore(PHOTOS_STORE).put({
          id,
          photos,
        } satisfies PhotoRecord);
        updated = { id, createdAt: metadata.createdAt, photos };
      };
      metadataRequest.onerror = () => reject(metadataRequest.error);
      transaction.oncomplete = () => {
        if (updated) resolve(updated);
      };
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function listSessionSummaries(): Promise<SessionSummary[]> {
  const db = await openDB();
  try {
    const items = await new Promise<SessionSummary[]>((resolve, reject) => {
      const request = db
        .transaction(META_STORE, "readonly")
        .objectStore(META_STORE)
        .getAll();
      request.onsuccess = () => resolve(request.result as SessionSummary[]);
      request.onerror = () => reject(request.error);
    });
    return items.sort((left, right) => right.createdAt - left.createdAt);
  } finally {
    db.close();
  }
}

export async function deleteSession(id: string): Promise<void> {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(
        [META_STORE, PHOTOS_STORE],
        "readwrite",
      );
      transaction.objectStore(META_STORE).delete(id);
      transaction.objectStore(PHOTOS_STORE).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function clearSessions(): Promise<void> {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const stores = [META_STORE, PHOTOS_STORE];
      if (db.objectStoreNames.contains(LEGACY_STORE)) stores.push(LEGACY_STORE);
      const transaction = db.transaction(stores, "readwrite");
      for (const store of stores) transaction.objectStore(store).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

/** Encode a source frame losslessly so My Photos remains a true master copy. */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/png",
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("encode failed"))),
      type,
      quality,
    );
  });
}

/** Encode masters one at a time to avoid four simultaneous PNG memory peaks. */
export async function canvasesToBlobs(
  canvases: HTMLCanvasElement[],
): Promise<Blob[]> {
  const blobs: Blob[] = [];
  for (const canvas of canvases) blobs.push(await canvasToBlob(canvas));
  return blobs;
}

/** Build a compact gallery cover without changing the full-resolution master. */
export function canvasToCoverBlob(
  source: HTMLCanvasElement,
  size = 240,
): Promise<Blob> {
  const cover = document.createElement("canvas");
  cover.width = size;
  cover.height = size;
  const context = cover.getContext("2d")!;
  configureHighQualityScaling(context);
  context.drawImage(
    source,
    0,
    0,
    source.width,
    source.height,
    0,
    0,
    size,
    size,
  );
  return canvasToBlob(cover, "image/jpeg", 0.86);
}

export function galleryCanvasSize(
  sourceWidth: number,
  sourceHeight: number,
  requestedSize?: number,
): { width: number; height: number } {
  if (requestedSize !== undefined) {
    return { width: requestedSize, height: requestedSize };
  }
  return {
    width: Math.max(1, sourceWidth),
    height: Math.max(1, sourceHeight),
  };
}

/** Load a stored photo blob without silently reducing its source resolution. */
export function blobToCanvas(
  blob: Blob,
  size?: number,
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const dimensions = galleryCanvasSize(
        image.naturalWidth || image.width,
        image.naturalHeight || image.height,
        size,
      );
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      const context = canvas.getContext("2d")!;
      configureHighQualityScaling(context);
      context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    image.onerror = (error) => {
      URL.revokeObjectURL(url);
      reject(error);
    };
    image.src = url;
  });
}
