import { BrandIcon, GearIcon } from "../icons";

/** Sticky top bar: brand wordmark (home) + My Photos and Settings. */
export function TopBar({
  onHome,
  onAlbum,
  onSettings,
  showActions,
}: {
  onHome: () => void;
  onAlbum: () => void;
  onSettings: () => void;
  showActions: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 -mx-4 flex items-center justify-between border-b-2 border-ink bg-cream px-4 py-2">
      <button
        onClick={onHome}
        aria-label="Home"
        className="font-display text-2xl uppercase tracking-wide text-ink"
      >
        Booth<span className="text-orange">Bop</span>
      </button>
      {showActions && (
        <div className="flex items-center gap-2">
          <button
            onClick={onAlbum}
            className="inline-flex items-center gap-1.5 border-2 border-ink bg-paper px-3 py-1 font-display text-lg uppercase tracking-wide text-ink transition active:translate-y-px active:bg-cream"
          >
            <BrandIcon name="gallery" className="h-5 w-5" />
            My Photos
          </button>
          <button
            onClick={onSettings}
            aria-label="Settings"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center border-2 border-ink bg-paper p-1.5 text-ink transition active:translate-y-px active:bg-cream"
          >
            <GearIcon className="h-5 w-5" />
          </button>
        </div>
      )}
    </header>
  );
}
