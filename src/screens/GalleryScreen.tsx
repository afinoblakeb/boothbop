import { useEffect, useRef, useState } from "react";
import {
  deleteSession,
  listSessionSummaries,
  loadSession,
  type Session,
  type SessionSummary,
} from "../lib/gallery";
import { Check } from "lucide-react";
import { BrandIcon, TrashIcon } from "../icons";
import { Button, Heading, OverlayScreen } from "../ui";

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
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

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

  function toggleSelection(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function leaveSelection() {
    setSelecting(false);
    setSelected(new Set());
  }

  async function deleteSelected() {
    const count = selected.size;
    if (!count) return;
    const label = count === 1 ? "photo set" : "photo sets";
    if (
      !window.confirm(
        `Delete ${count} selected ${label} from this device? This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      for (const id of selected) await deleteSession(id);
      leaveSelection();
      await reload();
    } catch {
      setError("Couldn't delete the selected photos. Try again.");
    }
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
    <OverlayScreen
      title="My Photos"
      onClose={close}
      action={
        sessions?.length ? (
          <button
            type="button"
            onClick={() => (selecting ? leaveSelection() : setSelecting(true))}
            className="min-h-11 rounded-md px-2 font-sans text-sm font-semibold text-accent outline-none focus-visible:underline focus-visible:underline-offset-4"
          >
            {selecting ? "Cancel" : "Select"}
          </button>
        ) : null
      }
    >
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
                selecting={selecting}
                selected={selected.has(s.id)}
                onActivate={() =>
                  selecting ? toggleSelection(s.id) : void open(s)
                }
              />
            ))}
          </div>
          {selecting && (
            <div className="sticky bottom-0 -mx-4 mt-4 flex items-center justify-between border-t border-border bg-app-canvas/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-md">
              <Button
                variant="quiet"
                size="sm"
                onClick={() =>
                  setSelected(
                    selected.size === sessions.length
                      ? new Set()
                      : new Set(sessions.map((session) => session.id)),
                  )
                }
              >
                {selected.size === sessions.length
                  ? "Deselect All"
                  : "Select All"}
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={selected.size === 0}
                onClick={() => void deleteSelected()}
                aria-label={`Delete ${selected.size} selected photo ${
                  selected.size === 1 ? "set" : "sets"
                }`}
              >
                <TrashIcon className="h-4 w-4" />
                Delete{selected.size ? ` (${selected.size})` : ""}
              </Button>
            </div>
          )}
        </>
      )}
    </OverlayScreen>
  );
}

/** Grid thumbnail: open normally, or act as a selection target in edit mode. */
function Cover({
  blob,
  onActivate,
  opening,
  selecting,
  selected,
}: {
  blob: Blob;
  onActivate: () => void;
  opening: boolean;
  selecting: boolean;
  selected: boolean;
}) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return (
    <button
      onClick={onActivate}
      disabled={opening}
      aria-label={
        selecting
          ? selected
            ? "Deselect photo set"
            : "Select photo set"
          : opening
            ? "Opening photo set"
            : "Open photo set"
      }
      aria-pressed={selecting ? selected : undefined}
      className={`relative block aspect-square w-full overflow-hidden rounded-md border bg-surface shadow-control outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:scale-[0.98] ${
        selected ? "border-accent ring-2 ring-accent" : "border-border"
      }`}
    >
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
      {opening && (
        <span className="absolute inset-0 flex items-center justify-center rounded-md bg-surface-inverse/55">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-text-inverse/30 border-t-accent" />
        </span>
      )}
      {selecting && (
        <span
          aria-hidden="true"
          className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-control ${
            selected
              ? "border-accent bg-accent text-on-accent"
              : "border-surface bg-editor/35 text-transparent"
          }`}
        >
          <Check className="h-4 w-4" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}
