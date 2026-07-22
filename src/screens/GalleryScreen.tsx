import { useEffect, useRef, useState } from "react";
import {
  clearSessions,
  deleteSession,
  listSessionSummaries,
  loadSession,
  type Session,
  type SessionSummary,
} from "../lib/gallery";
import { BrandIcon, TrashIcon } from "../icons";
import { Button, Heading, IconButton, OverlayScreen } from "../ui";

/** Full-screen overlay of past booth sessions; tap one to reopen it. */
export function GalleryScreen({
  onClose,
  onOpen,
}: {
  onClose: () => void;
  onOpen: (session: Session) => void;
}) {
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const openingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setError(null);
    try {
      setSessions(await listSessionSummaries());
    } catch {
      setSessions([]);
      setError("Couldn't load My Photos.");
    }
  };
  useEffect(() => {
    void reload();
  }, []);

  async function remove(id: string) {
    if (!window.confirm("Delete this photo set from this device?")) return;
    await deleteSession(id);
    await reload();
  }

  async function clearAll() {
    if (!window.confirm("Delete all saved photos from this device?")) return;
    await clearSessions();
    await reload();
  }

  async function open(summary: SessionSummary) {
    if (openingRef.current) return;
    openingRef.current = true;
    setOpening(summary.id);
    setError(null);
    try {
      onOpen(await loadSession(summary.id));
    } catch {
      setError("Couldn't load that photo set. Try again.");
    } finally {
      openingRef.current = false;
      setOpening(null);
    }
  }

  return (
    <OverlayScreen title="My Photos" onClose={onClose}>
      <p className="mt-1 font-sans text-xs uppercase tracking-wide text-warmgray">
        Tap a set to get its strip, GIF, or video. Saved on this device only.
      </p>
      {error && (
        <div role="alert" className="mt-3 font-sans text-sm text-orange-dark">
          {error}{" "}
          <button onClick={() => void reload()} className="min-h-11 underline">
            Retry
          </button>
        </div>
      )}

      {sessions === null ? (
        <p className="mt-16 text-center font-display text-xl uppercase text-brown">
          Loading…
        </p>
      ) : sessions.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center text-brown">
          <BrandIcon name="gallery" className="h-16 w-16" />
          <Heading as="p" size="lg" className="mt-3">
            No photos yet
          </Heading>
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
                blob={s.cover}
                opening={opening === s.id}
                onOpen={() => void open(s)}
                onDelete={() => remove(s.id)}
              />
            ))}
          </div>
          <Button
            variant="danger"
            size="md"
            fullWidth
            onClick={clearAll}
            className="mt-6"
          >
            <TrashIcon className="h-5 w-5" />
            Clear all
          </Button>
        </>
      )}
    </OverlayScreen>
  );
}

/** Grid thumbnail: tap to open the set, small corner button to delete it. */
function Cover({
  blob,
  onOpen,
  onDelete,
  opening,
}: {
  blob: Blob;
  onOpen: () => void;
  onDelete: () => void;
  opening: boolean;
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
        disabled={opening}
        aria-label={opening ? "Opening photo set" : "Open photo set"}
        className="block aspect-square w-full overflow-hidden border-2 border-ink bg-paper transition active:translate-y-px"
      >
        {url && <img src={url} alt="" className="h-full w-full object-cover" />}
        {opening && (
          <span className="absolute inset-0 flex items-center justify-center bg-ink/50">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-cream/30 border-t-orange" />
          </span>
        )}
      </button>
      <IconButton
        aria-label="Delete"
        onClick={onDelete}
        className="absolute right-0 top-0"
      >
        <span className="flex h-7 w-7 items-center justify-center border-2 border-ink bg-cream text-ink">
          <TrashIcon className="h-4 w-4" />
        </span>
      </IconButton>
    </div>
  );
}
