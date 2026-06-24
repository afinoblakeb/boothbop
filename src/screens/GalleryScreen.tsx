import { useEffect, useState } from "react";
import {
  clearSessions,
  deleteSession,
  listSessions,
  type Session,
} from "../lib/gallery";
import { BrandIcon, TrashIcon } from "../icons";

/** Full-screen overlay of past booth sessions; tap one to reopen it. */
export function GalleryScreen({
  onClose,
  onOpen,
}: {
  onClose: () => void;
  onOpen: (session: Session) => void;
}) {
  const [sessions, setSessions] = useState<Session[] | null>(null);

  const reload = () => listSessions().then(setSessions);
  useEffect(() => {
    reload();
  }, []);

  async function remove(id: string) {
    await deleteSession(id);
    reload();
  }

  async function clearAll() {
    if (!window.confirm("Delete all saved photos from this device?")) return;
    await clearSessions();
    reload();
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-cream text-ink">
      <div className="mx-auto max-w-md px-4 pb-10 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-3xl uppercase tracking-wide">
            My Photos
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-2 text-2xl text-brown"
          >
            ✕
          </button>
        </div>

        <p className="mt-1 font-sans text-xs uppercase tracking-wide text-warmgray">
          Tap a set to get its strip, GIF, or video. Saved on this device only.
        </p>

        {sessions === null ? (
          <p className="mt-16 text-center font-display text-xl uppercase text-brown">
            Loading…
          </p>
        ) : sessions.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center text-brown">
            <BrandIcon name="gallery" className="h-16 w-16" />
            <p className="mt-3 font-display text-2xl uppercase tracking-wide">
              No photos yet
            </p>
            <p className="font-sans text-sm text-warmgray">
              Your booth sessions are saved here automatically.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {sessions.map((s) => (
                <Cover
                  key={s.id}
                  blob={s.photos[0]}
                  onOpen={() => onOpen(s)}
                  onDelete={() => remove(s.id)}
                />
              ))}
            </div>
            <button
              onClick={clearAll}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 border-2 border-orange-dark bg-paper px-6 py-3 font-display text-lg uppercase tracking-wide text-orange-dark transition active:translate-y-px active:bg-cream"
            >
              <TrashIcon className="h-5 w-5" />
              Clear all
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Grid thumbnail: tap to open the set, small corner button to delete it. */
function Cover({
  blob,
  onOpen,
  onDelete,
}: {
  blob: Blob;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return (
    <div className="relative">
      <button
        onClick={onOpen}
        className="block aspect-square w-full overflow-hidden border-2 border-ink bg-paper transition active:translate-y-px"
      >
        {url && <img src={url} alt="" className="h-full w-full object-cover" />}
      </button>
      <button
        onClick={onDelete}
        aria-label="Delete"
        className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center"
      >
        <span className="flex h-7 w-7 items-center justify-center border-2 border-ink bg-cream text-ink">
          <TrashIcon className="h-4 w-4" />
        </span>
      </button>
    </div>
  );
}
