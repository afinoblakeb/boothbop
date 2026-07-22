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
  const activeRef = useRef(true);
  const openRequestRef = useRef(0);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setError(null);
    try {
      const summaries = await listSessionSummaries();
      if (activeRef.current) setSessions(summaries);
    } catch {
      if (activeRef.current) {
        setSessions([]);
        setError("Couldn't load My Photos.");
      }
    }
  };
  useEffect(() => {
    void reload();
    return () => {
      activeRef.current = false;
      openRequestRef.current += 1;
    };
  }, []);

  function close() {
    activeRef.current = false;
    openRequestRef.current += 1;
    onClose();
  }

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
    const request = ++openRequestRef.current;
    setOpening(summary.id);
    setError(null);
    try {
      const session = await loadSession(summary.id);
      if (!activeRef.current || request !== openRequestRef.current) return;
      activeRef.current = false;
      onOpen(session);
    } catch {
      if (activeRef.current && request === openRequestRef.current) {
        setError("Couldn't load that photo set. Try again.");
      }
    } finally {
      openingRef.current = false;
      if (activeRef.current && request === openRequestRef.current) {
        setOpening(null);
      }
    }
  }

  return (
    <OverlayScreen title="My Photos" onClose={close}>
      <p className="mt-2 max-w-sm font-sans text-sm leading-5 text-text-muted">
        Tap a set to get its strip, GIF, or video. Saved on this device only.
      </p>
      {error && (
        <div role="alert" className="mt-3 font-sans text-sm text-critical">
          {error}{" "}
          <button
            onClick={() => void reload()}
            className="min-h-11 rounded-md font-semibold underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Retry
          </button>
        </div>
      )}

      {sessions === null ? (
        <p className="mt-16 text-center font-sans text-sm font-medium text-text-muted">
          Loading…
        </p>
      ) : sessions.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center text-text">
          <BrandIcon name="gallery" className="h-12 w-12 opacity-80" />
          <Heading as="p" size="md" className="mt-4">
            No photos yet
          </Heading>
          <p className="mt-1 max-w-xs font-sans text-sm leading-5 text-text-muted">
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
            size="sm"
            onClick={clearAll}
            className="mx-auto mt-5 flex border-transparent bg-transparent shadow-none"
          >
            <TrashIcon className="h-4 w-4" />
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
        className="block aspect-square w-full overflow-hidden rounded-md border border-border bg-surface shadow-control outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:scale-[0.98]"
      >
        {url && <img src={url} alt="" className="h-full w-full object-cover" />}
        {opening && (
          <span className="absolute inset-0 flex items-center justify-center rounded-md bg-surface-inverse/55">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-text-inverse/30 border-t-accent" />
          </span>
        )}
      </button>
      <IconButton
        aria-label="Delete"
        onClick={onDelete}
        variant="surface"
        className="absolute right-1 top-1 text-critical"
      >
        <TrashIcon className="h-4 w-4" />
      </IconButton>
    </div>
  );
}
