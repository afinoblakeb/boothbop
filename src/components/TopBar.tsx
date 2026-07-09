import { BrandIcon, GearIcon } from "../icons";
import { Button, IconButton } from "../ui";

/** Sticky top bar: brand wordmark (home) + gallery and Settings. */
export function TopBar({
  onHome,
  onAlbum,
  onSettings,
  showActions,
  homeLabel = "Home",
}: {
  onHome: () => void;
  onAlbum: () => void;
  onSettings: () => void;
  showActions: boolean;
  homeLabel?: string;
}) {
  return (
    <header className="sticky top-0 z-30 -mx-4 flex items-center justify-between border-b-2 border-ink bg-cream px-4 py-1.5 sm:py-2">
      <button
        onClick={onHome}
        aria-label={homeLabel}
        className="font-display text-xl uppercase tracking-wide text-ink sm:text-2xl"
      >
        Booth<span className="text-orange">Bop</span>
      </button>
      {showActions && (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onAlbum}
            className="h-9 px-2 py-1 text-sm sm:h-10 sm:px-3 sm:py-1.5 sm:text-base"
          >
            <BrandIcon name="gallery" className="h-5 w-5" />
            Gallery
          </Button>
          <IconButton
            compact
            aria-label="Settings"
            onClick={onSettings}
            className="h-9 w-9 border-2 border-ink bg-paper text-ink transition active:translate-y-px active:bg-cream sm:h-10 sm:w-10"
          >
            <GearIcon className="h-5 w-5" />
          </IconButton>
        </div>
      )}
    </header>
  );
}
