import { useEffect, useState } from "react";
import {
  clearSessions,
  deleteSession,
  listSessions,
  type Session,
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
    <OverlayScreen title="My Photos" onClose={onClose}>
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
          <Heading as="p" size="lg" className="mt-3">
            No photos yet
          </Heading>
          <p className="font-sans text-sm text-warmgray">
            Your booth sessions are saved here automatically.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-4 font-display text-lg uppercase tracking-wide text-brown">
            {sessions.length} saved {sessions.length === 1 ? "set" : "sets"}
          </p>
          <div className="mt-3 space-y-5">
            {groupSessions(sessions).map(([day, items]) => (
              <section key={day}>
                <Heading as="h3" size="sm" className="mb-2 text-brown">
                  {day}
                </Heading>
                <div className="grid grid-cols-3 gap-2">
                  {items.map((s) => (
                    <Cover
                      key={s.id}
                      session={s}
                      onOpen={() => onOpen(s)}
                      onDelete={() => remove(s.id)}
                    />
                  ))}
                </div>
              </section>
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

function groupSessions(sessions: Session[]): [string, Session[]][] {
  const groups = new Map<string, Session[]>();
  for (const s of sessions) {
    const key = new Date(s.createdAt).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  return Array.from(groups.entries());
}

function timeLabel(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Grid thumbnail: tap to open the set, small corner button to delete it. */
function Cover({
  session,
  onOpen,
  onDelete,
}: {
  session: Session;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const u = URL.createObjectURL(session.photos[0]);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [session.photos]);
  return (
    <div className="relative">
      <button
        onClick={onOpen}
        className="block aspect-square w-full overflow-hidden border-2 border-ink bg-paper transition active:translate-y-px"
      >
        {url && <img src={url} alt="" className="h-full w-full object-cover" />}
        <span className="absolute inset-x-0 bottom-0 border-t-2 border-ink bg-cream/95 py-0.5 font-display text-xs uppercase tracking-wide text-ink">
          {timeLabel(session.createdAt)}
        </span>
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
