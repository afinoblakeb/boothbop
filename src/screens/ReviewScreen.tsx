import { useEffect, useState } from "react";
import { isVideoSupported } from "../lib/video";
import { THEMES, type Layout } from "../lib/strip";
import { FILTERS, type FilterId } from "../lib/filter";
import { DownloadIcon, RefreshIcon, ShareIcon } from "../icons";
import {
  Button,
  Callout,
  IconButton,
  SectionLabel,
  SegmentedControl,
  Toggle,
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
  filter,
  onFilter,
  boom,
  onBoom,
  thumbs,
  onRetakeOne,
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
  filter: FilterId;
  onFilter: (filter: FilterId) => void;
  boom: boolean;
  onBoom: (on: boolean) => void;
  thumbs: string[];
  onRetakeOne: (index: number) => void;
}) {
  const [showRetakePicker, setShowRetakePicker] = useState(false);
  const [showStyle, setShowStyle] = useState(false);
  useEffect(() => {
    if (!showStyle) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowStyle(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showStyle]);
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

      {format === "gif" && (
        <div className="mt-3 flex w-full items-center justify-between border-2 border-ink bg-paper px-3 py-2">
          <div>
            <SectionLabel>Boom</SectionLabel>
            <p className="font-sans text-xs text-warmgray">
              Play forward and back
            </p>
          </div>
          <Toggle on={boom} onChange={onBoom} />
        </div>
      )}

      <Button
        variant="secondary"
        size="sm"
        fullWidth
        onClick={() => setShowStyle(true)}
        className="mt-3"
      >
        Style
      </Button>

      {showStyle && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Style"
          className="fixed inset-0 z-50"
        >
          <button
            aria-label="Close Style"
            className="absolute inset-0 cursor-default"
            onClick={() => setShowStyle(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[48dvh] overflow-y-auto border-t-2 border-ink bg-paper pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_0_rgba(17,17,17,0.12)]">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-ink bg-paper px-4 py-2">
              <h2 className="font-display text-2xl uppercase tracking-wide text-ink">
                Style
              </h2>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowStyle(false)}
              >
                Done
              </Button>
            </div>
            <div className="p-4">
              <SectionLabel className="mb-1">Look</SectionLabel>
              <div className="grid grid-cols-3 gap-2">
                {FILTERS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onFilter(item.id)}
                    aria-pressed={filter === item.id}
                    className={`min-h-11 border-2 border-ink px-2 py-1 font-display text-sm uppercase tracking-wide ${
                      filter === item.id
                        ? "bg-orange text-cream"
                        : "bg-cream text-ink"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {format === "strip" && (
                <>
                  <SectionLabel className="mb-1 mt-4">Layout</SectionLabel>
                  <SegmentedControl
                    fullWidth
                    label="Strip layout"
                    value={layout}
                    onChange={setLayout}
                    options={[
                      { value: "4x1", label: "Strip" },
                      { value: "2x2", label: "Grid" },
                    ]}
                    itemClassName="flex min-h-11 items-center justify-center py-2 text-base"
                  />

                  <SectionLabel className="mb-1 mt-4">Color</SectionLabel>
                  <div className="grid grid-cols-6 gap-2 px-1">
                    {Object.entries(THEMES).map(([key, theme]) => (
                      <button
                        key={key}
                        onClick={() => setThemeKey(key)}
                        aria-label={THEME_LABELS[key]}
                        aria-pressed={themeKey === key}
                        className={`aspect-square w-full border-2 border-ink transition ${
                          themeKey === key
                            ? "ring-2 ring-ink ring-offset-2 ring-offset-paper"
                            : ""
                        }`}
                        style={{ background: theme.background }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
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
        onClick={() => setShowRetakePicker((shown) => !shown)}
        className="mt-3"
      >
        <RefreshIcon className="h-6 w-6" />
        Retake One
      </Button>
      {showRetakePicker && (
        <div
          className="mt-2 grid w-full grid-cols-4 gap-2"
          aria-label="Choose a photo to retake"
        >
          {thumbs.map((thumb, index) => (
            <button
              key={index}
              onClick={() => onRetakeOne(index)}
              aria-label={`Retake photo ${index + 1}`}
              className="relative aspect-square min-h-11 overflow-hidden border-2 border-ink bg-paper"
            >
              <img src={thumb} alt="" className="h-full w-full object-cover" />
              <span className="absolute bottom-0 right-0 bg-ink px-1.5 py-0.5 font-display text-sm text-cream">
                {index + 1}
              </span>
            </button>
          ))}
        </div>
      )}
      <Button
        variant="secondary"
        size="sm"
        fullWidth
        onClick={onRetake}
        className="mt-2"
      >
        Start Over
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
