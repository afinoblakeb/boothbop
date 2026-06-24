import { isVideoSupported } from "../lib/video";
import { THEMES, type Layout } from "../lib/strip";
import { DownloadIcon, RefreshIcon, ShareIcon } from "../icons";
import {
  Button,
  Callout,
  IconButton,
  SectionLabel,
  SegmentedControl,
} from "../ui";
import { ZoomableImage } from "../components/ZoomableImage";
import type { Format } from "../types";

// Human-readable names for the strip color themes (for screen readers — the
// swatches are otherwise color-only). Keys mirror THEMES in lib/strip.ts.
const THEME_LABELS: Record<string, string> = {
  classic: "Cream",
  rust: "Rust",
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
      <SegmentedControl
        ariaRole="tab"
        fullWidth
        value={format}
        onChange={onSelectFormat}
        options={tabs.map((t) => ({ value: t.id, label: t.label }))}
        itemClassName="py-3 text-xl"
      />

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
          <ZoomableImage
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
            <SectionLabel className="mb-1 text-center">Layout</SectionLabel>
            <SegmentedControl
              className="mx-auto"
              label="Strip layout"
              value={layout}
              onChange={setLayout}
              options={[
                { value: "4x1", label: "Strip" },
                { value: "2x2", label: "Grid" },
              ]}
              itemClassName="flex min-h-[44px] items-center justify-center px-6 py-2 text-lg"
            />
          </div>

          <div className="mt-3">
            <SectionLabel className="mb-1 text-center">Color</SectionLabel>
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
        <Callout
          tone="info"
          className="mt-4 flex w-full items-center gap-2 px-3 py-2 text-left"
        >
          <p className="flex-1 font-sans text-xs text-ink">
            New: auto-save your photos to a BoothBop album.{" "}
            <button
              onClick={onOpenSettings}
              className="font-semibold text-teal underline"
            >
              Open Settings
            </button>
          </p>
          <IconButton
            aria-label="Dismiss"
            onClick={onDismissTip}
            className="shrink-0 text-lg leading-none text-brown"
          >
            ✕
          </IconButton>
        </Callout>
      )}

      {/* Actions: one dominant primary, clear secondaries */}
      {shareFilesOk ? (
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onShare}
          disabled={isBusy || !previewUrl}
          className="mt-4"
        >
          <ShareIcon className="h-7 w-7" />
          Save / Share
        </Button>
      ) : (
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onDownload}
          disabled={isBusy || !previewUrl}
          className="mt-4"
        >
          <DownloadIcon className="h-7 w-7" />
          {saveLabel}
        </Button>
      )}
      <Button
        variant="secondary"
        size="md"
        fullWidth
        onClick={onRetake}
        className="mt-3"
      >
        <RefreshIcon className="h-6 w-6" />
        Take Again
      </Button>

      {note && (
        <p className="mt-3 text-center font-sans text-sm text-teal">{note}</p>
      )}

      <p className="mt-3 max-w-xs text-center font-sans text-xs text-warmgray">
        Photos stay on this device. BoothBop never uploads or stores them.
      </p>

      {error && (
        <Callout
          as="p"
          tone="error"
          className="mt-4 px-4 py-3 font-sans text-sm text-orange-dark"
        >
          {error}
        </Callout>
      )}
    </div>
  );
}
