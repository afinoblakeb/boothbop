import { useEffect, useState } from "react";
import {
  blobToCanvas,
  clearSessions,
  deleteSession,
  listSessions,
  updateSessionMeta,
  type Session,
} from "../lib/gallery";
import { DEFAULT_LAYOUT } from "../lib/style";
import { composeStrip, THEMES } from "../lib/strip";
import { BrandIcon, StarIcon, TrashIcon } from "../icons";
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
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const visibleSessions =
    sessions?.filter((session) => !favoritesOnly || session.favorite) ?? null;
  const hasFavorites = sessions?.some((session) => session.favorite) ?? false;

  const reload = () => loadGallerySessions().then(setSessions);
  useEffect(() => {
    let active = true;
    loadGallerySessions().then((items) => {
      if (active) setSessions(items);
    });
    return () => {
      active = false;
    };
  }, []);

  async function remove(id: string) {
    await deleteSession(id);
    reload();
  }

  async function favorite(session: Session) {
    await updateSessionMeta(session.id, { favorite: !session.favorite });
    reload();
  }

  async function clearAll() {
    if (
      !window.confirm(
        "Clear BoothBop Gallery? This removes saved sets from this app only. Photos you already saved or shared stay where they are.",
      )
    )
      return;
    await clearSessions();
    reload();
  }

  return (
    <OverlayScreen title="BoothBop Gallery" onClose={onClose}>
      <p className="mt-1 font-sans text-xs uppercase tracking-wide text-warmgray">
        Tap a set to reopen its strip, GIF, or video. These are saved in
        BoothBop on this device only; sample sets are included for trying looks.
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
            Finished booth sessions appear here automatically.
          </p>
        </div>
      ) : visibleSessions?.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center text-brown">
          <BrandIcon name="gallery" className="h-16 w-16" />
          <Heading as="p" size="lg" className="mt-3">
            No favorites yet
          </Heading>
          <p className="font-sans text-sm text-warmgray">
            Star a set to keep it at the top.
          </p>
          <Button
            variant="secondary"
            size="md"
            onClick={() => setFavoritesOnly(false)}
            className="mt-4"
          >
            Show all
          </Button>
        </div>
      ) : (
        <>
          {hasFavorites && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setFavoritesOnly(false)}
                aria-pressed={!favoritesOnly}
                className={`border-2 border-ink px-3 py-2 font-display text-base uppercase tracking-wide transition active:translate-y-px ${
                  !favoritesOnly ? "bg-orange text-cream" : "bg-paper text-ink"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFavoritesOnly(true)}
                aria-pressed={favoritesOnly}
                className={`border-2 border-ink px-3 py-2 font-display text-base uppercase tracking-wide transition active:translate-y-px ${
                  favoritesOnly ? "bg-orange text-cream" : "bg-paper text-ink"
                }`}
              >
                Favorites
              </button>
            </div>
          )}
          <p className="mt-4 font-display text-lg uppercase tracking-wide text-brown">
            {galleryCountLabel(visibleSessions ?? [])}
          </p>
          <div className="mt-3 space-y-5">
            {groupSessions(visibleSessions ?? []).map(([day, items]) => (
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
                      sample={isSampleSessionId(s.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
          {sessions.some((s) => !isSampleSessionId(s.id)) && (
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

async function loadGallerySessions(): Promise<Session[]> {
  const saved = await listSessions();
  try {
    const { loadSampleSessions } = await import("../lib/demo");
    return [...(await loadSampleSessions()), ...saved];
  } catch {
    return saved;
  }
}

function isSampleSessionId(id: string): boolean {
  return id.startsWith("demo-");
}

function galleryCountLabel(sessions: Session[]): string {
  const samples = sessions.filter((s) => isSampleSessionId(s.id)).length;
  const saved = sessions.length - samples;
  if (samples && saved) return `${samples} samples + ${saved} saved`;
  if (samples) return `${samples} sample ${samples === 1 ? "set" : "sets"}`;
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
  sample,
}: {
  session: Session;
  onOpen: () => void;
  onDelete: () => void;
  onFavorite: () => void;
  sample: boolean;
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
        style?.layout ?? DEFAULT_LAYOUT,
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
      {!sample && (
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
