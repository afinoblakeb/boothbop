// Native share for the iOS/Android shell (Capacitor).
//
// The Web Share API works in a WKWebView for Messages/AirDrop, but iOS does NOT
// expose "Save Image" / "Save Video" to the Photos library for files shared
// that way. The native Capacitor share sheet does — but it needs a real file
// URI, so we first write the blob to the cache directory, then share that.
//
// Web builds never call this (guarded by isNativeShell); the Capacitor plugins
// are dynamically imported so they stay out of the web path.
import { isNativeShell } from "./platform";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // strip the "data:<type>;base64," prefix Filesystem doesn't want
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function uniqueShareFilename(
  filename: string,
  id: string = crypto.randomUUID(),
) {
  return `${id}-${filename}`;
}

/**
 * Share/save a generated file through the native iOS share sheet (which
 * includes Save Image / Save Video). Returns false on the web so callers can
 * fall back to the Web Share API. Throws if the user cancels or it fails.
 */
export async function nativeShareFile(
  blob: Blob,
  filename: string,
): Promise<boolean> {
  if (!isNativeShell()) return false;
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);
  const data = await blobToBase64(blob);
  const path = uniqueShareFilename(filename);
  const { uri } = await Filesystem.writeFile({
    path,
    data,
    directory: Directory.Cache,
  });
  try {
    await Share.share({ title: "BoothBop", files: [uri] });
    return true;
  } finally {
    await Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(
      () => {},
    );
  }
}
