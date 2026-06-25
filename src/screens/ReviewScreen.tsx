import { isVideoSupported } from "../lib/video";
import { SESSION_TITLE_MAX } from "../lib/gallery";
import { THEMES, type Layout } from "../lib/strip";
import type {
  FilterDef,
  FilterKey,
  StickerDef,
  StickerKey,
} from "../lib/render";
import type { StylePreset } from "../lib/templates";
import type { MoveDirection } from "../lib/sequence";
import {
  isPremiumFilter,
  isPremiumLayout,
  isPremiumSticker,
} from "../lib/entitlements";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  DownloadIcon,
  RefreshIcon,
  ShareIcon,
  StarIcon,
} from "../icons";
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
  filter,
  filters,
  setFilter,
  sticker,
  stickers,
  setSticker,
  stylePresets,
  isPro,
  onApplyPreset,
  error,
  note,
  shareFilesOk,
  savingAll,
  thumbs,
  sessionTitle,
  sessionFavorite,
  canManageSession,
  autosaveTip,
  onOpenSettings,
  onDismissTip,
  onShare,
  onDownload,
  onSaveAll,
  onSessionTitle,
  onToggleFavorite,
  onRetake,
  onRetakeShot,
  onMoveShot,
}: {
  format: Format;
  onSelectFormat: (f: Format) => void;
  previewUrl: string | null;
  generating: null | "gif" | "boomerang" | "video";
  layout: Layout;
  setLayout: (l: Layout) => void;
  themeKey: keyof typeof THEMES;
  setThemeKey: (k: keyof typeof THEMES) => void;
  filter: FilterKey;
  filters: Record<FilterKey, FilterDef>;
  setFilter: (f: FilterKey) => void;
  sticker: StickerKey;
  stickers: Record<StickerKey, StickerDef>;
  setSticker: (s: StickerKey) => void;
  stylePresets: readonly StylePreset[];
  isPro: boolean;
  onApplyPreset: (preset: StylePreset) => void;
  error: string | null;
  note: string | null;
  shareFilesOk: boolean;
  savingAll: boolean;
  thumbs: string[];
  sessionTitle: string;
  sessionFavorite: boolean;
  canManageSession: boolean;
  autosaveTip: boolean;
  onOpenSettings: () => void;
  onDismissTip: () => void;
  onShare: () => void;
  onDownload: () => void;
  onSaveAll: () => void;
  onSessionTitle: (title: string) => void;
  onToggleFavorite: () => void;
  onRetake: () => void;
  onRetakeShot: (index: number) => void;
  onMoveShot: (index: number, direction: MoveDirection) => void;
}) {
  const tabs: { id: Format; label: string }[] = [
    { id: "strip", label: "Strip" },
    { id: "gif", label: "GIF" },
    { id: "boomerang", label: "Boom" },
    ...(isVideoSupported() ? [{ id: "video" as Format, label: "Video" }] : []),
  ];
  const saveLabel =
    format === "video"
      ? "Save Video"
      : format === "gif" || format === "boomerang"
        ? "Save GIF"
        : "Save Photo";
  const isBusy = generating !== null;

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto py-4 pb-8">
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
      <div className="mt-3 flex h-[clamp(240px,42vh,520px)] w-full shrink-0 items-center justify-center overflow-hidden">
        {isBusy ? (
          <div className="flex flex-col items-center gap-3 font-display text-xl uppercase tracking-wide text-brown">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-ink/20 border-t-orange" />
            {generating === "video"
              ? "Recording video…"
              : generating === "boomerang"
                ? "Making your boomerang…"
                : "Making your GIF…"}
          </div>
        ) : format === "video" && previewUrl ? (
          <video
            src={previewUrl}
            className="max-h-full max-w-full border-2 border-ink object-contain"
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
            className="max-h-full max-w-full border-2 border-ink object-contain"
          />
        ) : null}
      </div>

      {canManageSession && (
        <div className="mt-4 flex w-full items-end gap-2">
          <label className="min-w-0 flex-1">
            <SectionLabel className="mb-1">Session</SectionLabel>
            <input
              value={sessionTitle}
              maxLength={SESSION_TITLE_MAX}
              onChange={(e) => onSessionTitle(e.target.value)}
              placeholder="Name this set"
              className="h-11 w-full border-2 border-ink bg-paper px-3 font-sans text-base text-ink outline-none focus:ring-4 focus:ring-orange/35"
            />
          </label>
          <button
            onClick={onToggleFavorite}
            aria-label={sessionFavorite ? "Unfavorite" : "Favorite"}
            aria-pressed={sessionFavorite}
            className={`flex h-11 w-11 shrink-0 items-center justify-center border-2 border-ink transition active:translate-y-px ${
              sessionFavorite ? "bg-mustard text-ink" : "bg-paper text-ink"
            }`}
          >
            <StarIcon className="h-6 w-6" filled={sessionFavorite} />
          </button>
        </div>
      )}

      <div className="mt-4 w-full">
        <SectionLabel className="mb-1 text-center">Look</SectionLabel>
        <SegmentedControl
          className="mx-auto"
          label="Photo look"
          value={filter}
          onChange={setFilter}
          options={(Object.entries(filters) as [FilterKey, FilterDef][]).map(
            ([value, f]) => ({
              value,
              label:
                isPremiumFilter(value) && !isPro ? `${f.label} Pro` : f.label,
              disabled: isPremiumFilter(value) && !isPro,
            }),
          )}
          itemClassName="flex min-h-[40px] items-center justify-center px-3 py-2 text-sm"
        />
      </div>

      <div className="mt-3 w-full">
        <SectionLabel className="mb-1 text-center">Props</SectionLabel>
        <SegmentedControl
          className="mx-auto"
          label="Photo props"
          value={sticker}
          onChange={setSticker}
          options={(Object.entries(stickers) as [StickerKey, StickerDef][]).map(
            ([value, item]) => ({
              value,
              label:
                isPremiumSticker(value) && !isPro
                  ? `${item.label} Pro`
                  : item.label,
              disabled: isPremiumSticker(value) && !isPro,
            }),
          )}
          itemClassName="flex min-h-[40px] items-center justify-center px-3 py-2 text-sm"
        />
      </div>

      <div className="mt-4 w-full">
        <SectionLabel className="mb-1 text-center">Presets</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          {stylePresets.map((preset) => {
            const locked = preset.pro && !isPro;
            return (
              <button
                key={preset.id}
                onClick={() => onApplyPreset(preset)}
                className={`min-h-[46px] border-2 border-ink px-2 py-2 font-display text-sm uppercase tracking-wide transition active:translate-y-px ${
                  locked ? "bg-cream text-brown" : "bg-paper text-ink"
                }`}
              >
                <span className="block leading-none">{preset.label}</span>
                {preset.pro && (
                  <span className="mt-1 block font-sans text-[10px] font-bold uppercase tracking-wide text-orange-dark">
                    Pro
                  </span>
                )}
              </button>
            );
          })}
        </div>
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
                { value: "4x1", label: "Classic" },
                { value: "2x2", label: "Grid" },
                {
                  value: "2x6",
                  label: "2×6 Pro",
                  disabled: isPremiumLayout("2x6") && !isPro,
                },
                {
                  value: "4x6",
                  label: "4×6 Pro",
                  disabled: isPremiumLayout("4x6") && !isPro,
                },
                {
                  value: "story",
                  label: "Story Pro",
                  disabled: isPremiumLayout("story") && !isPro,
                },
              ]}
              itemClassName="flex min-h-[44px] items-center justify-center px-3 py-2 text-sm"
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
          {format === "boomerang"
            ? "Boomerang rebounds your four photos forward and back."
            : `${format === "gif" ? "GIF" : "Video"} plays your four photos in a loop.`}
        </p>
      )}

      <div className="mt-4 w-full">
        <SectionLabel className="mb-1 text-center">Shots</SectionLabel>
        <div className="grid grid-cols-4 gap-2">
          {thumbs.map((src, i) => (
            <div key={i} className="min-w-0">
              <button
                onClick={() => onRetakeShot(i)}
                className="group relative aspect-square w-full overflow-hidden border-2 border-ink bg-paper transition active:translate-y-px"
                aria-label={`Retake shot ${i + 1}`}
              >
                <img
                  src={src}
                  alt=""
                  className="h-full w-full object-cover"
                  draggable={false}
                />
                <span className="absolute inset-x-0 bottom-0 border-t-2 border-ink bg-cream/95 py-0.5 font-display text-xs uppercase tracking-wide text-ink">
                  {i + 1}
                </span>
              </button>
              <div className="mt-1 grid grid-cols-2 gap-1">
                <IconButton
                  compact
                  aria-label={`Move shot ${i + 1} earlier`}
                  onClick={() => onMoveShot(i, -1)}
                  disabled={i === 0}
                  className="h-9 border-2 border-ink bg-paper text-ink transition disabled:opacity-35 active:translate-y-px disabled:active:translate-y-0"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                </IconButton>
                <IconButton
                  compact
                  aria-label={`Move shot ${i + 1} later`}
                  onClick={() => onMoveShot(i, 1)}
                  disabled={i === thumbs.length - 1}
                  className="h-9 border-2 border-ink bg-paper text-ink transition disabled:opacity-35 active:translate-y-px disabled:active:translate-y-0"
                >
                  <ArrowRightIcon className="h-4 w-4" />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      </div>

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
        onClick={onSaveAll}
        disabled={isBusy || savingAll || !previewUrl}
        className="mt-3"
      >
        <DownloadIcon className="h-6 w-6" />
        {savingAll ? "Saving All…" : "Save All"}
      </Button>
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
