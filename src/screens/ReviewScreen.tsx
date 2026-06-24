import { isVideoSupported } from "../lib/video";
import { THEMES, type Layout } from "../lib/strip";
import { DownloadIcon, RefreshIcon, ShareIcon } from "../icons";
import { btnPrimary, btnSecondary } from "../ui";
import type { Format } from "../types";

// Human-readable names for the strip color themes (for screen readers — the
// swatches are otherwise color-only). Keys mirror THEMES in lib/strip.ts.
const THEME_LABELS: Record<string, string> = {
  classic: "Cream",
  orange: "Orange",
  teal: "Teal",
  mustard: "Mustard",
  olive: "Olive",
  carbon: "Carbon",
};

/** The result screen: format tabs, live preview, strip styling, and actions. */
export function ReviewScreen({
  format,
  onSelectFormat,
  previewUrl,
  generating,
  layout,
  setLayout,
  themeKey,
  setThemeKey,
  error,
  note,
  shareFilesOk,
  autosaveTip,
  onOpenSettings,
  onDismissTip,
  onShare,
  onDownload,
  onRetake,
}: {
  format: Format;
  onSelectFormat: (f: Format) => void;
  previewUrl: string | null;
  generating: null | "gif" | "video";
  layout: Layout;
  setLayout: (l: Layout) => void;
  themeKey: keyof typeof THEMES;
  setThemeKey: (k: keyof typeof THEMES) => void;
  error: string | null;
  note: string | null;
  shareFilesOk: boolean;
  autosaveTip: boolean;
  onOpenSettings: () => void;
  onDismissTip: () => void;
  onShare: () => void;
  onDownload: () => void;
  onRetake: () => void;
}) {
  const tabs: { id: Format; label: string }[] = [
    { id: "strip", label: "Strip" },
    { id: "gif", label: "GIF" },
    ...(isVideoSupported() ? [{ id: "video" as Format, label: "Video" }] : []),
  ];
  const saveLabel =
    format === "video"
      ? "Save Video"
      : format === "gif"
        ? "Save GIF"
        : "Save Photo";
  const isBusy = generating !== null;

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center py-4">
      {/* Format tabs */}
      <div
        role="tablist"
        className="flex w-full divide-x-2 divide-ink border-2 border-ink bg-paper"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={format === t.id}
            onClick={() => onSelectFormat(t.id)}
            className={`flex-1 py-3 font-display text-xl uppercase tracking-wide transition ${
              format === t.id ? "bg-orange text-cream" : "text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Live preview of the selected output */}
      <div className="mt-3 flex min-h-0 w-full flex-1 items-center justify-center">
        {isBusy ? (
          <div className="flex flex-col items-center gap-3 font-display text-xl uppercase tracking-wide text-brown">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-ink/20 border-t-orange" />
            {generating === "gif" ? "Making your GIF…" : "Recording video…"}
          </div>
        ) : format === "video" && previewUrl ? (
          <video
            src={previewUrl}
            className="max-h-full w-auto border-2 border-ink"
            autoPlay
            loop
            muted
            playsInline
            controls
          />
        ) : previewUrl ? (
          <img
            src={previewUrl}
            alt={`Your ${format}`}
            className="max-h-full w-auto border-2 border-ink"
          />
        ) : null}
      </div>

      {/* Strip-only styling controls */}
      {format === "strip" ? (
        <>
          <div className="mt-4">
            <p className="mb-1 text-center font-sans text-xs font-bold uppercase tracking-widest text-warmgray">
              Layout
            </p>
            <div className="mx-auto flex w-max divide-x-2 divide-ink border-2 border-ink bg-paper">
              {(["4x1", "2x2"] as Layout[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLayout(l)}
                  aria-pressed={layout === l}
                  className={`flex min-h-[44px] items-center justify-center px-6 py-2 font-display text-lg uppercase tracking-wide transition ${
                    layout === l ? "bg-orange text-cream" : "text-ink"
                  }`}
                >
                  {l === "4x1" ? "Strip" : "Grid"}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <p className="mb-1 text-center font-sans text-xs font-bold uppercase tracking-widest text-warmgray">
              Color
            </p>
            <div className="flex justify-center gap-3">
              {Object.entries(THEMES).map(([key, theme]) => (
                <button
                  key={key}
                  onClick={() => setThemeKey(key)}
                  aria-label={THEME_LABELS[key]}
                  aria-pressed={themeKey === key}
                  className={`h-11 w-11 border-2 border-ink transition ${
                    themeKey === key
                      ? "ring-4 ring-ink ring-offset-2 ring-offset-cream"
                      : ""
                  }`}
                  style={{ background: theme.background }}
                />
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="mt-3 text-center font-sans text-xs uppercase tracking-wide text-warmgray">
          {format === "gif" ? "GIF" : "Video"} plays your four photos in a loop.
        </p>
      )}

      {/* One-time nudge: surface the native auto-save-to-Photos feature. */}
      {autosaveTip && (
        <div className="mt-4 flex w-full items-center gap-2 border-2 border-teal bg-teal/10 px-3 py-2 text-left">
          <p className="flex-1 font-sans text-xs text-ink">
            New: auto-save your photos to a BoothBop album.{" "}
            <button
              onClick={onOpenSettings}
              className="font-semibold text-teal underline"
            >
              Open Settings
            </button>
          </p>
          <button
            onClick={onDismissTip}
            aria-label="Dismiss"
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center text-lg leading-none text-brown"
          >
            ✕
          </button>
        </div>
      )}

      {/* Actions: one dominant primary, clear secondaries */}
      {shareFilesOk ? (
        <>
          <button
            onClick={onShare}
            disabled={isBusy || !previewUrl}
            className={`mt-4 w-full px-6 py-3.5 text-2xl ${btnPrimary}`}
          >
            <ShareIcon className="h-7 w-7" />
            Save / Share
          </button>
          <button
            onClick={onRetake}
            className={`mt-3 w-full px-6 py-3 ${btnSecondary}`}
          >
            <RefreshIcon className="h-6 w-6" />
            Take Again
          </button>
        </>
      ) : (
        <>
          <button
            onClick={onDownload}
            disabled={isBusy || !previewUrl}
            className={`mt-4 w-full px-6 py-3.5 text-2xl ${btnPrimary}`}
          >
            <DownloadIcon className="h-7 w-7" />
            {saveLabel}
          </button>
          <button
            onClick={onRetake}
            className={`mt-3 w-full px-6 py-3 ${btnSecondary}`}
          >
            <RefreshIcon className="h-6 w-6" />
            Take Again
          </button>
        </>
      )}

      {note && (
        <p className="mt-3 text-center font-sans text-sm text-teal">{note}</p>
      )}

      <p className="mt-3 max-w-xs text-center font-sans text-xs text-warmgray">
        Photos stay on this device. BoothBop never uploads or stores them.
      </p>

      {error && (
        <p className="mt-4 border-2 border-orange-dark bg-orange/10 px-4 py-3 font-sans text-sm text-orange-dark">
          {error}
        </p>
      )}
    </div>
  );
}
