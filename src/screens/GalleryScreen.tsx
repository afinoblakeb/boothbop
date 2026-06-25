import { useEffect, useState } from "react";
import {
  blobToCanvas,
  clearSessions,
  deleteSession,
  listSessions,
  updateSessionMeta,
  type Session,
} from "../lib/gallery";
import { composeStrip, THEMES } from "../lib/strip";
import { BrandIcon, StarIcon, TrashIcon } from "../icons";
import { Button, Heading, IconButton, OverlayScreen } from "../ui";

/** Full-screen overlay of past booth sessions; tap one to reopen it. */
export function GalleryScreen({
  onClose,
  onOpen,
  demo = false,
}: {
  onClose: () => void;
  onOpen: (session: Session) => void;
  demo?: boolean;
}) {
  const [sessions, setSessions] = useState<Session[] | null>(null);

  const reload = () => loadGallerySessions(demo).then(setSessions);
  useEffect(() => {
    let active = true;
    loadGallerySessions(demo).then((items) => {
      if (active) setSessions(items);
    });
    return () => {
      active = false;
    };
  }, [demo]);

  async function remove(id: string) {
    await deleteSession(id);
    reload();
  }

  async function favorite(session: Session) {
    await updateSessionMeta(session.id, { favorite: !session.favorite });
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
            {galleryCountLabel(sessions)}
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
                      onFavorite={() => favorite(s)}
                      demo={isDemoSessionId(s.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
          {sessions.some((s) => !isDemoSessionId(s.id)) && (
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
          )}
        </>
      )}
    </OverlayScreen>
  );
}

async function loadGallerySessions(demo: boolean): Promise<Session[]> {
  const saved = await listSessions();
  if (!demo) return saved;
  const { loadSampleSessions } = await import("../lib/demo");
  return [...(await loadSampleSessions()), ...saved];
}

function isDemoSessionId(id: string): boolean {
  return id.startsWith("demo-");
}

function galleryCountLabel(sessions: Session[]): string {
  const demo = sessions.filter((s) => isDemoSessionId(s.id)).length;
  const saved = sessions.length - demo;
  if (demo && saved) return `${demo} demo + ${saved} saved`;
  if (demo) return `${demo} demo ${demo === 1 ? "set" : "sets"}`;
  return `${saved} saved ${saved === 1 ? "set" : "sets"}`;
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
  onFavorite,
  demo,
}: {
  session: Session;
  onOpen: () => void;
  onDelete: () => void;
  onFavorite: () => void;
  demo: boolean;
}) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let active = true;
    let fallbackUrl = URL.createObjectURL(session.photos[0]);
    setUrl(fallbackUrl);

    async function renderCover() {
      if (session.photos.length < 4) return;
      const frames = await Promise.all(
        session.photos.map((photo) => blobToCanvas(photo, 320)),
      );
      const style = session.style;
      const canvas = composeStrip(
        frames,
        style?.layout ?? "2x2",
        THEMES[style?.themeKey ?? "classic"],
        {
          cell: 220,
          watermark: false,
          filter: style?.filter ?? "none",
          sticker: style?.sticker ?? "none",
          caption: style?.caption,
        },
      );
      if (!active) return;
      setUrl(canvas.toDataURL("image/jpeg", 0.82));
      URL.revokeObjectURL(fallbackUrl);
      fallbackUrl = "";
    }

    renderCover().catch(() => {});
    return () => {
      active = false;
      if (fallbackUrl) URL.revokeObjectURL(fallbackUrl);
    };
  }, [session]);
  return (
    <div className="relative">
      <button
        onClick={onOpen}
        className="block aspect-square w-full overflow-hidden border-2 border-ink bg-paper transition active:translate-y-px"
      >
        {url && <img src={url} alt="" className="h-full w-full object-cover" />}
        <span className="absolute inset-x-0 bottom-0 border-t-2 border-ink bg-cream/95 py-0.5 font-display text-xs uppercase tracking-wide text-ink">
          {session.title || timeLabel(session.createdAt)}
        </span>
      </button>
      {!demo && (
        <>
          <IconButton
            aria-label={session.favorite ? "Unfavorite" : "Favorite"}
            onClick={onFavorite}
            className="absolute left-0 top-0"
          >
            <span
              className={`flex h-7 w-7 items-center justify-center border-2 border-ink ${
                session.favorite ? "bg-mustard text-ink" : "bg-cream text-ink"
              }`}
            >
              <StarIcon className="h-4 w-4" filled={session.favorite} />
            </span>
          </IconButton>
          <IconButton
            aria-label="Delete"
            onClick={onDelete}
            className="absolute right-0 top-0"
          >
            <span className="flex h-7 w-7 items-center justify-center border-2 border-ink bg-cream text-ink">
              <TrashIcon className="h-4 w-4" />
            </span>
          </IconButton>
        </>
      )}
    </div>
  );
}
