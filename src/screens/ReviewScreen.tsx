import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { THEMES, type Layout } from "../lib/strip";
import { createFilterPreview, FILTERS, type FilterId } from "../lib/filter";
import {
  ColorsIcon,
  DownloadIcon,
  LayoutIcon,
  LooksIcon,
  RefreshIcon,
  ShareIcon,
} from "../icons";
import {
  Callout,
  IconButton,
  SectionLabel,
  SegmentedControl,
  Toggle,
} from "../ui";
import { ZoomableImage } from "../components/ZoomableImage";
import type { Format } from "../types";
import type { BoomSpeed } from "../lib/boom";
import type { RuntimeFeatureFlags } from "../lib/remoteConfig";
import { useModalFocus } from "../hooks/useModalFocus";

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

type EditTool = "look" | "layout" | "colors";

/** The result screen: format tabs, live preview, strip styling, and actions. */
export function ReviewScreen({
  format,
  onSelectFormat,
  previewUrl,
  generating,
  socialPreparation,
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
  shareLabel,
  onShareOriginalGif,
  onDownload,
  onRetake,
  filter,
  onFilter,
  boom,
  onBoom,
  boomSpeed,
  onBoomSpeed,
  thumbs,
  onRetakeOne,
  features,
}: {
  format: Format;
  onSelectFormat: (f: Format) => void;
  previewUrl: string | null;
  generating: null | "gif" | "video" | "share";
  socialPreparation: "idle" | "preparing" | "ready" | "error";
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
  shareLabel: string;
  onShareOriginalGif: () => void;
  onDownload: () => void;
  onRetake: () => void;
  filter: FilterId;
  onFilter: (filter: FilterId) => void;
  boom: boolean;
  onBoom: (on: boolean) => void;
  boomSpeed: BoomSpeed;
  onBoomSpeed: (speed: BoomSpeed) => void;
  thumbs: string[];
  onRetakeOne: (index: number) => void;
  features: RuntimeFeatureFlags;
}) {
  const [showRetakePicker, setShowRetakePicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTool, setEditTool] = useState<EditTool>("look");
  const [lookPreviews, setLookPreviews] = useState<
    Partial<Record<FilterId, string>>
  >({});

  useEffect(() => {
    if (!editing || !thumbs[0]) return;
    let cancelled = false;

    void Promise.all(
      FILTERS.map(
        async ({ id }) =>
          [id, await createFilterPreview(thumbs[0], id)] as const,
      ),
    ).then((previews) => {
      if (!cancelled) setLookPreviews(Object.fromEntries(previews));
    });

    return () => {
      cancelled = true;
    };
  }, [editing, thumbs]);

  const openEditor = () => {
    onSelectFormat("strip");
    setEditTool("look");
    setEditing(true);
  };
  const tabs: { id: Format; label: string }[] = [
    { id: "strip", label: "Strip" },
    ...(features.gif ? [{ id: "gif" as Format, label: "GIF" }] : []),
    ...(features.video ? [{ id: "video" as Format, label: "Video" }] : []),
  ];
  const saveLabel =
    format === "video"
      ? "Save Video"
      : format === "gif"
        ? "Save GIF"
        : "Save Photo";
  const isBusy = generating !== null;
  const mediaGenerating = generating === format;
  const socialPreparing = format === "gif" && socialPreparation === "preparing";
  const sharePreparing = generating === "share" || socialPreparing;

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center py-3">
      {/* Format tabs */}
      <SegmentedControl
        ariaRole="tab"
        fullWidth
        value={format}
        onChange={onSelectFormat}
        options={tabs.map((t) => ({ value: t.id, label: t.label }))}
        itemClassName="text-sm"
      />

      {/* Live preview of the selected output */}
      <div className="relative mt-3 flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden rounded-md bg-surface-muted/60 p-2">
        {mediaGenerating ? (
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col items-center gap-3 font-sans text-sm font-semibold text-text-muted"
          >
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-ink/20 border-t-orange" />
            {generating === "gif" ? "Making your GIF…" : "Recording video…"}
          </div>
        ) : format === "video" && previewUrl ? (
          <video
            src={previewUrl}
            className="max-h-full w-auto rounded-sm shadow-control"
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
            className="max-h-full w-auto rounded-sm shadow-control"
          />
        ) : null}
        {sharePreparing && !mediaGenerating && (
          <div
            role="status"
            aria-live="polite"
            className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-md border border-editor-border bg-editor/95 px-3 py-2 font-sans text-xs font-semibold text-text-inverse shadow-overlay"
          >
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-cream/30 border-t-orange" />
            Preparing high-quality share…
          </div>
        )}
      </div>

      {format === "gif" && features.boom && (
        <div className="mt-3 w-full rounded-lg border border-border bg-surface px-3 py-2">
          <div className="flex items-center justify-between">
            <div>
              <SectionLabel>Boom</SectionLabel>
              <p className="font-sans text-xs text-warmgray">
                Play forward and back
              </p>
            </div>
            <Toggle aria-label="Boom" on={boom} onChange={onBoom} />
          </div>
          {boom && (
            <label className="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-2 border-t border-border pt-2 font-sans text-xs text-text-muted">
              <span>Slow</span>
              <input
                type="range"
                min="1"
                max="3"
                step="1"
                value={boomSpeed}
                onChange={(event) =>
                  onBoomSpeed(Number(event.target.value) as BoomSpeed)
                }
                aria-label="Boom speed"
                aria-valuetext={
                  boomSpeed === 3 ? "Fast" : boomSpeed === 2 ? "Medium" : "Slow"
                }
                className="h-7 w-full cursor-pointer"
                style={{ accentColor: "var(--color-orange)" }}
              />
              <span>Fast</span>
            </label>
          )}
        </div>
      )}

      {editing && features.editor && (
        <PhotoEditor
          previewUrl={previewUrl}
          activeTool={editTool}
          setActiveTool={setEditTool}
          lookPreviews={lookPreviews}
          filter={filter}
          onFilter={onFilter}
          layout={layout}
          setLayout={setLayout}
          themeKey={themeKey}
          setThemeKey={setThemeKey}
          onDone={() => setEditing(false)}
        />
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

      {/* Compact review toolbar keeps the output visible on every phone size. */}
      <div
        className="mt-3 grid w-full gap-1 rounded-lg bg-surface-muted p-1"
        style={{
          gridTemplateColumns: `repeat(${1 + Number(features.editor) + Number(features.retakeOne)}, minmax(0, 1fr))`,
        }}
      >
        {features.editor && (
          <ReviewAction label="Edit" onClick={openEditor}>
            <SlidersHorizontal className="h-6 w-6" strokeWidth={2.25} />
          </ReviewAction>
        )}
        {features.retakeOne && (
          <ReviewAction
            label="Retake One"
            onClick={() => setShowRetakePicker((shown) => !shown)}
            pressed={showRetakePicker}
          >
            <RefreshIcon className="h-6 w-6" />
          </ReviewAction>
        )}
        {shareFilesOk ? (
          <ReviewAction
            label={sharePreparing ? "Preparing..." : shareLabel}
            onClick={onShare}
            disabled={isBusy || socialPreparing || !previewUrl}
            primary
          >
            <ShareIcon className="h-6 w-6" />
          </ReviewAction>
        ) : (
          <ReviewAction
            label={saveLabel}
            onClick={onDownload}
            disabled={isBusy || !previewUrl}
            primary
          >
            <DownloadIcon className="h-6 w-6" />
          </ReviewAction>
        )}
      </div>
      {showRetakePicker && features.retakeOne && (
        <RetakePicker
          thumbs={thumbs}
          onClose={() => setShowRetakePicker(false)}
          onSelect={onRetakeOne}
        />
      )}
      <div className="mt-1 flex min-h-8 items-center justify-center gap-4 font-sans text-xs font-semibold text-text-muted">
        {format === "gif" && shareFilesOk && (
          <button
            type="button"
            onClick={onShareOriginalGif}
            disabled={isBusy || !previewUrl}
            className="min-h-11 rounded-md px-2 outline-none transition focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
          >
            Share Original GIF
          </button>
        )}
        <button
          type="button"
          onClick={onRetake}
          className="min-h-11 rounded-md px-2 outline-none transition focus-visible:ring-2 focus-visible:ring-accent"
        >
          Start Over
        </button>
      </div>

      {note && (
        <p
          role="status"
          aria-live="polite"
          className="mt-3 text-center font-sans text-sm text-positive"
        >
          {note}
        </p>
      )}

      <p className="mt-2 max-w-xs text-center font-sans text-xs text-text-muted">
        Photos stay on this device. BoothBop never uploads or stores them.
      </p>

      {error && (
        <div role="alert">
          <Callout
            as="p"
            tone="error"
            className="mt-4 px-4 py-3 font-sans text-sm text-orange-dark"
          >
            {error}
          </Callout>
        </div>
      )}
    </div>
  );
}

function RetakePicker({
  thumbs,
  onClose,
  onSelect,
}: {
  thumbs: string[];
  onClose: () => void;
  onSelect: (index: number) => void;
}) {
  const modalRef = useModalFocus<HTMLDivElement>(onClose);
  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label="Choose a photo to retake"
      className="fixed inset-0 z-40 flex items-end bg-black/45"
    >
      <div className="w-full rounded-t-lg border-t border-border bg-surface px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 shadow-overlay">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <SectionLabel>Retake one</SectionLabel>
          <IconButton data-autofocus aria-label="Close" onClick={onClose}>
            ✕
          </IconButton>
        </div>
        <div className="mx-auto mt-2 grid max-w-md grid-cols-4 gap-2">
          {thumbs.map((thumb, index) => (
            <button
              key={index}
              onClick={() => onSelect(index)}
              aria-label={`Choose photo ${index + 1} to retake`}
              className="relative aspect-square min-h-11 overflow-hidden rounded-md border border-border bg-surface-muted outline-none transition focus-visible:ring-2 focus-visible:ring-accent"
            >
              <img src={thumb} alt="" className="h-full w-full object-cover" />
              <span className="absolute bottom-1 right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-editor/85 px-1 font-sans text-xs font-semibold text-text-inverse">
                {index + 1}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReviewAction({
  label,
  onClick,
  disabled = false,
  pressed,
  primary = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 font-sans text-[11px] font-semibold leading-tight outline-none transition focus-visible:bg-surface focus-visible:text-accent disabled:opacity-40 ${
        primary
          ? "bg-accent text-on-accent shadow-control active:bg-accent-strong"
          : pressed
            ? "bg-surface text-accent shadow-control"
            : "text-text-muted active:bg-surface/70"
      }`}
    >
      {children}
      <span className="max-w-full text-center">{label}</span>
    </button>
  );
}

function PhotoEditor({
  previewUrl,
  activeTool,
  setActiveTool,
  lookPreviews,
  filter,
  onFilter,
  layout,
  setLayout,
  themeKey,
  setThemeKey,
  onDone,
}: {
  previewUrl: string | null;
  activeTool: EditTool;
  setActiveTool: (tool: EditTool) => void;
  lookPreviews: Partial<Record<FilterId, string>>;
  filter: FilterId;
  onFilter: (filter: FilterId) => void;
  layout: Layout;
  setLayout: (layout: Layout) => void;
  themeKey: keyof typeof THEMES;
  setThemeKey: (theme: keyof typeof THEMES) => void;
  onDone: () => void;
}) {
  const modalRef = useModalFocus<HTMLDivElement>(onDone);
  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label="Edit photos"
      className="fixed inset-0 z-50 flex min-h-0 flex-col overflow-hidden bg-editor text-text-inverse"
    >
      <header className="relative flex h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 items-end justify-center border-b border-editor-border px-4 pb-3 pt-[env(safe-area-inset-top)]">
        <h2 className="font-sans text-base font-semibold">Edit</h2>
        <button
          data-autofocus
          type="button"
          onClick={onDone}
          className="absolute bottom-2 right-3 min-h-11 rounded-md px-2 font-sans text-base font-semibold text-accent outline-none focus-visible:underline focus-visible:underline-offset-4"
        >
          Done
        </button>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3 py-2">
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Editing strip"
            className="max-h-full max-w-full object-contain shadow-[0_2px_16px_rgba(0,0,0,0.45)]"
          />
        )}
      </div>

      <div className="h-[7.4rem] shrink-0 border-t border-editor-border bg-editor-surface">
        {activeTool === "look" && (
          <div className="flex h-full snap-x items-center gap-3 overflow-x-auto px-4 pb-2 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FILTERS.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => onFilter(item.id)}
                aria-label={item.label}
                aria-pressed={filter === item.id}
                className="flex w-[4.5rem] shrink-0 snap-center flex-col items-center gap-1 rounded-md font-sans text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span
                  className={`block h-[4.5rem] w-[4.5rem] overflow-hidden rounded-md border-2 ${
                    filter === item.id ? "border-orange" : "border-transparent"
                  }`}
                >
                  <img
                    src={lookPreviews[item.id] ?? lookPreviews.original}
                    alt={`${item.label} preview`}
                    className="h-full w-full object-cover"
                  />
                </span>
                <span className={filter === item.id ? "text-orange" : ""}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        )}

        {activeTool === "layout" && (
          <div
            role="group"
            aria-label="Strip layout"
            className="flex h-full items-center justify-center gap-10"
          >
            <LayoutChoice
              label="Strip"
              selected={layout === "4x1"}
              onClick={() => setLayout("4x1")}
              layout="strip"
            />
            <LayoutChoice
              label="Grid"
              selected={layout === "2x2"}
              onClick={() => setLayout("2x2")}
              layout="grid"
            />
          </div>
        )}

        {activeTool === "colors" && (
          <div className="flex h-full items-center gap-5 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {Object.entries(THEMES).map(([key, theme]) => (
              <button
                type="button"
                key={key}
                onClick={() => setThemeKey(key)}
                aria-label={THEME_LABELS[key]}
                aria-pressed={themeKey === key}
                className={`h-14 w-14 shrink-0 rounded-full border-2 transition ${
                  themeKey === key
                    ? "border-accent ring-2 ring-accent ring-offset-2 ring-offset-editor-surface"
                    : "border-editor-border"
                }`}
                style={{ background: theme.background }}
              />
            ))}
          </div>
        )}
      </div>

      <nav className="grid h-[calc(4.4rem+env(safe-area-inset-bottom))] shrink-0 grid-cols-3 border-t border-editor-border bg-editor pb-[env(safe-area-inset-bottom)]">
        <EditorTool
          label="Look"
          selected={activeTool === "look"}
          onClick={() => setActiveTool("look")}
        >
          <LooksIcon className="h-6 w-6" />
        </EditorTool>
        <EditorTool
          label="Layout"
          selected={activeTool === "layout"}
          onClick={() => setActiveTool("layout")}
        >
          <LayoutIcon className="h-6 w-6" />
        </EditorTool>
        <EditorTool
          label="Colors"
          selected={activeTool === "colors"}
          onClick={() => setActiveTool("colors")}
        >
          <ColorsIcon className="h-6 w-6" />
        </EditorTool>
      </nav>
    </div>
  );
}

function EditorTool({
  label,
  selected,
  onClick,
  children,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-w-0 flex-col items-center justify-center gap-1 font-sans text-[11px] font-medium ${
        selected ? "text-accent" : "text-editor-muted"
      }`}
    >
      {children}
      {label}
    </button>
  );
}

function LayoutChoice({
  label,
  selected,
  onClick,
  layout,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  layout: "strip" | "grid";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-w-20 flex-col items-center gap-2 font-sans text-xs ${
        selected ? "text-accent" : "text-editor-muted"
      }`}
    >
      <span
        className={`grid h-16 w-16 gap-1 border-2 p-1 ${
          selected ? "border-accent" : "border-editor-border"
        } ${layout === "strip" ? "grid-cols-1" : "grid-cols-2"}`}
      >
        {[0, 1, 2, 3].map((index) => (
          <span key={index} className="bg-text-inverse/75" />
        ))}
      </span>
      {label}
    </button>
  );
}
