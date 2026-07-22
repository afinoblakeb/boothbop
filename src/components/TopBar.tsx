import { Images, Settings } from "lucide-react";
import { LOGO } from "../constants";
import { IconButton } from "../ui";

/** Sticky top bar: quiet brand wordmark plus familiar utility actions. */
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
    <header className="sticky top-0 z-30 -mx-4 flex min-h-[57px] items-center justify-between border-b border-border bg-app-canvas/95 px-3 py-1.5 backdrop-blur-md">
      <button
        onClick={onHome}
        aria-label="Home"
        className="inline-flex min-h-[44px] items-center rounded-lg px-1 outline-none transition focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-canvas active:opacity-60"
      >
        <img
          src={LOGO}
          alt="BoothBop"
          className="h-8 w-auto max-w-[7.75rem] object-contain object-left"
        />
      </button>
      {showActions && (
        <nav aria-label="App" className="flex items-center gap-0.5">
          <IconButton
            aria-label="My Photos"
            onClick={onAlbum}
            title="My Photos"
          >
            <Images className="h-5 w-5" aria-hidden="true" />
          </IconButton>
          <IconButton
            aria-label="Settings"
            onClick={onSettings}
            title="Settings"
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
          </IconButton>
        </nav>
      )}
    </header>
  );
}
