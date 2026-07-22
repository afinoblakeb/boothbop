import { Camera, Images, Settings } from "lucide-react";
import { LOGO } from "../constants";
import { IconButton } from "../ui";

/** Sticky top bar: quiet brand wordmark plus familiar utility actions. */
export function TopBar({
  onHome,
  onCamera,
  onAlbum,
  onSettings,
  showActions,
  showCamera,
}: {
  onHome?: () => void;
  onCamera: () => void;
  onAlbum: () => void;
  onSettings: () => void;
  showActions: boolean;
  showCamera: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 -mx-4 flex min-h-[57px] items-center justify-between border-b border-border bg-app-canvas/95 px-3 py-1.5 backdrop-blur-md">
      {onHome ? (
        <button
          onClick={onHome}
          aria-label="Home"
          className="inline-flex min-h-[44px] items-center rounded-lg px-1 outline-none transition focus-visible:bg-surface-muted active:opacity-60"
        >
          <img
            src={LOGO}
            alt="BoothBop"
            className="h-8 w-auto max-w-[7.75rem] object-contain object-left"
          />
        </button>
      ) : (
        <img
          src={LOGO}
          alt="BoothBop"
          className="ml-1 h-8 w-auto max-w-[7.75rem] object-contain object-left"
        />
      )}
      {showActions && (
        <nav aria-label="App" className="flex items-center gap-0.5">
          {showCamera && (
            <IconButton aria-label="Camera" onClick={onCamera} title="Camera">
              <Camera className="h-5 w-5" aria-hidden="true" />
            </IconButton>
          )}
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
