import { BrandIcon, GearIcon } from "../icons";
import { Button, IconButton } from "../ui";

/** Sticky top bar: brand wordmark (home) + gallery and Settings. */
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
          <Button variant="secondary" size="sm" onClick={onAlbum}>
            <BrandIcon name="gallery" className="h-5 w-5" />
            Gallery
          </Button>
          <IconButton
            compact
            aria-label="Settings"
            onClick={onSettings}
            className="h-10 w-10 border-2 border-ink bg-paper text-ink transition active:translate-y-px active:bg-cream"
          >
            <GearIcon className="h-5 w-5" />
          </IconButton>
        </div>
      )}
    </header>
  );
}
