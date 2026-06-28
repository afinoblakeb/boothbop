import { type ReactNode, useEffect, useRef, useState } from "react";
import { isVideoSupported } from "../lib/video";
import { SESSION_TITLE_MAX } from "../lib/gallery";
import type { PartyResetSeconds } from "../lib/partyMode";
import { THEMES, type Layout } from "../lib/strip";
import type {
  FilterDef,
  FilterKey,
  StickerDef,
  StickerKey,
} from "../lib/render";
import { stylePresetMetaLabel, type StylePreset } from "../lib/templates";
import type { MoveDirection } from "../lib/sequence";
import { STYLE_CAPTION_MAX } from "../lib/style";
import { isPremiumFilter, isPremiumSticker } from "../lib/entitlements";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  DownloadIcon,
  RefreshIcon,
  ShareIcon,
  SlidersIcon,
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

type EditorTab = "look" | "layout" | "props" | "text" | "shots" | "templates";

const EDITOR_TABS: { id: EditorTab; label: string }[] = [
  { id: "look", label: "Look" },
  { id: "layout", label: "Layout" },
  { id: "props", label: "Props" },
  { id: "text", label: "Text" },
  { id: "shots", label: "Shots" },
  { id: "templates", label: "Templates" },
];

function EditorChoiceGrid<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-2 gap-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={selected}
            className={`flex min-h-11 items-center justify-center border-2 border-ink px-2 py-2 text-center font-display text-base uppercase leading-none tracking-wide transition active:translate-y-px ${
              selected ? "bg-orange text-cream" : "bg-paper text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** The result screen: preview and export actions; edit mode is a workbench. */
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
  native,
  savingAll,
  partyMode,
  partyResetSeconds,
  thumbs,
  sessionTitle,
  sessionFavorite,
  customCaption,
  canManageSession,
  autosaveTip,
  localSaveNotice,
  onOpenSettings,
  onOpenPro,
  onDismissTip,
  onDismissLocalSaveNotice,
  onBrowseTemplates,
  onShare,
  onSave,
  onSaveAll,
  onSessionTitle,
  onToggleFavorite,
  onCustomCaption,
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
  native: boolean;
  savingAll: boolean;
  partyMode: boolean;
  partyResetSeconds: PartyResetSeconds;
  thumbs: string[];
  sessionTitle: string;
  sessionFavorite: boolean;
  customCaption: string;
  canManageSession: boolean;
  autosaveTip: boolean;
  localSaveNotice: boolean;
  onOpenSettings: () => void;
  onOpenPro: () => void;
  onDismissTip: () => void;
  onDismissLocalSaveNotice: () => void;
  onBrowseTemplates: () => void;
  onShare: () => void | Promise<void>;
  onSave: () => void | Promise<void>;
  onSaveAll: () => void | Promise<void>;
  onSessionTitle: (title: string) => void;
  onToggleFavorite: () => void;
  onCustomCaption: (caption: string) => void;
  onRetake: () => void;
  onRetakeShot: (index: number) => void;
  onMoveShot: (index: number, direction: MoveDirection) => void;
}) {
  const tabs: { id: Format; label: string }[] = [
    { id: "strip", label: "Strip" },
    { id: "gif", label: "GIF" },
    { id: "boomerang", label: "Boom" },
    ...(isVideoSupported() ? [{ id: "video" as Format, label: "Video" }] : []),
    ...(isPro && !partyMode ? [{ id: "print" as Format, label: "4x6" }] : []),
  ];
  const downloadLabel =
    format === "video"
      ? "Download Video"
      : format === "print"
        ? "Download Sheet"
        : format === "gif" || format === "boomerang"
          ? "Download GIF"
          : "Download PNG";
  const isBusy = generating !== null;
  const canShare = native || shareFilesOk;
  const saveLabel = native ? "Save Photo" : downloadLabel;
  const [editOpen, setEditOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<EditorTab>("look");
  const [guestActionPending, setGuestActionPending] = useState(false);
  const [partyCountdown, setPartyCountdown] =
    useState<number>(partyResetSeconds);
  const onRetakeRef = useRef(onRetake);
  const retakeLabel = partyMode ? "Next Guest" : "Take Again";
  const resetActive =
    partyMode &&
    partyResetSeconds > 0 &&
    previewUrl !== null &&
    !isBusy &&
    !guestActionPending;
  const showQuickRetake = !partyMode && thumbs.length >= 4;
  const previewFrameClass = showQuickRetake
    ? "mt-1 flex h-[clamp(130px,23svh,300px)] w-full shrink-0 items-center justify-center overflow-hidden"
    : "mt-1 flex h-[clamp(150px,30svh,380px)] w-full shrink-0 items-center justify-center overflow-hidden";

  useEffect(() => {
    onRetakeRef.current = onRetake;
  }, [onRetake]);

  useEffect(() => {
    setGuestActionPending(false);
    setPartyCountdown(partyResetSeconds);
  }, [partyMode, partyResetSeconds, previewUrl]);

  useEffect(() => {
    if (!resetActive) return;
    setPartyCountdown(partyResetSeconds);
    const id = window.setInterval(() => {
      setPartyCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(id);
          onRetakeRef.current();
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [partyResetSeconds, resetActive]);

  function runGuestAction(action: () => void | Promise<void>) {
    if (!partyMode) {
      void action();
      return;
    }
    setGuestActionPending(true);
    void Promise.resolve(action()).finally(() => setGuestActionPending(false));
  }

  function selectEditorTab(tab: EditorTab) {
    setEditorTab(tab);
    if (tab === "layout" && format !== "strip") onSelectFormat("strip");
  }

  if (!partyMode && editOpen) {
    return (
      <EditorWorkbench
        format={format}
        previewUrl={previewUrl}
        generating={generating}
        activeTab={editorTab}
        onTab={selectEditorTab}
        layout={layout}
        setLayout={setLayout}
        themeKey={themeKey}
        setThemeKey={setThemeKey}
        filter={filter}
        filters={filters}
        setFilter={setFilter}
        sticker={sticker}
        stickers={stickers}
        setSticker={setSticker}
        stylePresets={stylePresets}
        isPro={isPro}
        onApplyPreset={onApplyPreset}
        error={error}
        thumbs={thumbs}
        sessionTitle={sessionTitle}
        sessionFavorite={sessionFavorite}
        customCaption={customCaption}
        canManageSession={canManageSession}
        autosaveTip={autosaveTip}
        onOpenSettings={onOpenSettings}
        onOpenPro={onOpenPro}
        onDismissTip={onDismissTip}
        onBrowseTemplates={onBrowseTemplates}
        onSessionTitle={onSessionTitle}
        onToggleFavorite={onToggleFavorite}
        onCustomCaption={onCustomCaption}
        onRetake={onRetake}
        onRetakeShot={onRetakeShot}
        onMoveShot={onMoveShot}
        onDone={() => setEditOpen(false)}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto overflow-x-hidden py-1 pb-3 sm:py-2 sm:pb-4">
      {/* Live preview of the selected output */}
      <div className={previewFrameClass}>
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

      <section className="mt-1 w-full">
        <SectionLabel className="mb-1 text-center">Output</SectionLabel>
        <SegmentedControl
          ariaRole="tab"
          fullWidth
          value={format}
          onChange={onSelectFormat}
          options={tabs.map((t) => ({ value: t.id, label: t.label }))}
          itemClassName="py-2 text-base leading-none sm:py-3"
        />
        <p className="review-output-copy mt-1 text-center font-sans text-xs text-warmgray sm:mt-2">
          {format === "print"
            ? "4x6 sheet export for two 2x6 strips."
            : format === "boomerang"
              ? "Rebounds your four photos forward and back."
              : format === "gif"
                ? "Loops your four photos as a GIF."
                : format === "video"
                  ? "Loops your four photos as a video."
                  : "Classic four-photo strip."}
        </p>
      </section>

      <div className="mt-2 grid w-full grid-cols-2 gap-2">
        {!partyMode && (
          <Button
            variant="secondary"
            size="md"
            onClick={() => setEditOpen((open) => !open)}
            aria-expanded="false"
            className="h-12 whitespace-nowrap px-2 text-lg leading-none sm:h-14 sm:px-3 sm:text-xl"
          >
            <SlidersIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            Edit
          </Button>
        )}
        <Button
          variant="primary"
          size="md"
          fullWidth
          onClick={() => runGuestAction(onSave)}
          disabled={isBusy || !previewUrl}
          className={
            partyMode
              ? "col-span-2 h-12 whitespace-nowrap px-2 text-lg leading-none sm:h-14 sm:px-3 sm:text-xl"
              : "h-12 whitespace-nowrap px-2 text-lg leading-none sm:h-14 sm:px-3 sm:text-xl"
          }
        >
          <DownloadIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          {saveLabel}
        </Button>
        {canShare && (
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => runGuestAction(onShare)}
            disabled={isBusy || !previewUrl}
            className={
              partyMode
                ? "col-span-2 h-11 whitespace-nowrap px-2 text-base leading-none sm:h-12 sm:px-3 sm:text-xl"
                : "h-11 whitespace-nowrap px-2 text-base leading-none sm:h-12 sm:px-3 sm:text-xl"
            }
          >
            <ShareIcon className="h-5 w-5" />
            Share
          </Button>
        )}
        {!partyMode && (
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={onSaveAll}
            disabled={isBusy || savingAll || thumbs.length < 4}
            className={`${canShare ? "h-11" : "col-span-2 h-11"} whitespace-nowrap px-2 text-base leading-none sm:h-12 sm:px-3 sm:text-xl`}
          >
            <DownloadIcon className="h-5 w-5" />
            {savingAll ? "Saving…" : "Save All"}
          </Button>
        )}
      </div>

      {showQuickRetake && (
        <section className="mt-2 w-full sm:mt-3">
          <div className="mb-1 flex items-center justify-between">
            <SectionLabel>Retake One</SectionLabel>
            <span className="font-sans text-[11px] font-bold uppercase tracking-wide text-warmgray">
              Tap a frame
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {thumbs.map((src, i) => (
              <button
                key={i}
                onClick={() => onRetakeShot(i)}
                className="group relative h-[clamp(64px,9svh,96px)] min-h-0 overflow-hidden border-2 border-ink bg-paper transition active:translate-y-px sm:aspect-square sm:h-auto"
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
            ))}
          </div>
        </section>
      )}

      {note && (
        <p className="mt-3 text-center font-sans text-sm text-teal">{note}</p>
      )}

      {error && (
        <Callout
          as="p"
          tone="error"
          className="mt-4 px-4 py-3 font-sans text-sm text-orange-dark"
        >
          {error}
        </Callout>
      )}

      {localSaveNotice && !partyMode && (
        <Callout
          tone="info"
          className="mt-3 flex w-full items-center gap-2 px-3 py-2 text-left"
        >
          <p className="flex-1 font-sans text-xs text-ink">
            Saved in BoothBop Gallery on this device. Use{" "}
            {native ? "Save to Photos" : "Download"} or Share when you want a
            copy outside the app.
          </p>
          <IconButton
            aria-label="Dismiss local save notice"
            onClick={onDismissLocalSaveNotice}
            className="shrink-0 text-lg leading-none text-brown"
          >
            ✕
          </IconButton>
        </Callout>
      )}

      {partyMode ? (
        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={onRetake}
          className="mt-3"
        >
          <RefreshIcon className="h-6 w-6" />
          {retakeLabel}
        </Button>
      ) : (
        <button
          onClick={onRetake}
          className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 px-3 font-display text-lg uppercase tracking-wide text-brown underline decoration-2 underline-offset-4 transition active:translate-y-px"
        >
          <RefreshIcon className="h-5 w-5" />
          {retakeLabel}
        </button>
      )}
      {partyMode && (
        <p className="mt-1 max-w-xs text-center font-sans text-xs text-teal">
          {resetActive
            ? `Next guest starts in ${partyCountdown}s.`
            : guestActionPending
              ? "Finishing save/share, then the next guest starts."
              : "Guest Mode keeps this style ready for the next friend."}
        </p>
      )}
      <p className="review-trust-copy mt-2 max-w-xs text-center font-sans text-xs text-warmgray">
        BoothBop never uploads your photos. Saved sets stay only in this app on
        this device until you delete them.
      </p>
    </div>
  );
}

function PreviewPane({
  format,
  previewUrl,
  generating,
  className,
}: {
  format: Format;
  previewUrl: string | null;
  generating: null | "gif" | "boomerang" | "video";
  className: string;
}) {
  return (
    <div className={className}>
      {generating !== null ? (
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
  );
}

function EditorWorkbench({
  format,
  previewUrl,
  generating,
  activeTab,
  onTab,
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
  thumbs,
  sessionTitle,
  sessionFavorite,
  customCaption,
  canManageSession,
  autosaveTip,
  onOpenSettings,
  onOpenPro,
  onDismissTip,
  onBrowseTemplates,
  onSessionTitle,
  onToggleFavorite,
  onCustomCaption,
  onRetake,
  onRetakeShot,
  onMoveShot,
  onDone,
}: {
  format: Format;
  previewUrl: string | null;
  generating: null | "gif" | "boomerang" | "video";
  activeTab: EditorTab;
  onTab: (tab: EditorTab) => void;
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
  thumbs: string[];
  sessionTitle: string;
  sessionFavorite: boolean;
  customCaption: string;
  canManageSession: boolean;
  autosaveTip: boolean;
  onOpenSettings: () => void;
  onOpenPro: () => void;
  onDismissTip: () => void;
  onBrowseTemplates: () => void;
  onSessionTitle: (title: string) => void;
  onToggleFavorite: () => void;
  onCustomCaption: (caption: string) => void;
  onRetake: () => void;
  onRetakeShot: (index: number) => void;
  onMoveShot: (index: number, direction: MoveDirection) => void;
  onDone: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden py-2 pb-4">
      <section className="shrink-0 border-b-2 border-ink bg-cream pb-3">
        <div className="flex items-center justify-between gap-3">
          <SectionLabel>Edit</SectionLabel>
          <button
            type="button"
            onClick={onDone}
            className="inline-flex h-10 items-center justify-center border-2 border-ink bg-orange px-4 font-display text-lg uppercase tracking-wide text-cream transition active:translate-y-px active:bg-orange-dark"
          >
            Done
          </button>
        </div>
        <PreviewPane
          format={format}
          previewUrl={previewUrl}
          generating={generating}
          className="mt-2 flex h-[clamp(145px,32svh,360px)] w-full items-center justify-center overflow-hidden"
        />
        {error && (
          <Callout
            as="p"
            tone="error"
            className="mt-2 px-3 py-2 font-sans text-xs text-orange-dark"
          >
            {error}
          </Callout>
        )}
      </section>

      <div className="-mx-4 shrink-0 overflow-x-auto border-b-2 border-ink bg-cream px-4 py-2">
        <div className="flex w-max min-w-full gap-2">
          {EDITOR_TABS.map((tab) => {
            const selected = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTab(tab.id)}
                aria-pressed={selected}
                className={`min-h-10 min-w-20 border-2 border-ink px-3 font-display text-base uppercase tracking-wide transition active:translate-y-px ${
                  selected ? "bg-orange text-cream" : "bg-paper text-ink"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <section className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pt-3">
        {activeTab === "look" && (
          <EditorChoiceGrid
            label="Photo look"
            value={filter}
            onChange={setFilter}
            options={(Object.entries(filters) as [FilterKey, FilterDef][]).map(
              ([value, f]) => ({
                value,
                label:
                  isPremiumFilter(value) && !isPro ? `${f.label} Pro` : f.label,
              }),
            )}
          />
        )}

        {activeTab === "layout" && (
          <div className="space-y-4">
            <div>
              <SectionLabel className="mb-1 text-center">Layout</SectionLabel>
              <EditorChoiceGrid
                label="Strip layout"
                value={layout}
                onChange={setLayout}
                options={[
                  { value: "4x1", label: "Classic" },
                  { value: "2x2", label: "Grid" },
                  { value: "2x6", label: "2×6 Pro" },
                  { value: "4x6", label: "4×6 Pro" },
                  { value: "story", label: "Story Pro" },
                ]}
              />
            </div>

            <div>
              <SectionLabel className="mb-1 text-center">Color</SectionLabel>
              <div className="flex flex-wrap justify-center gap-2 px-1">
                {Object.entries(THEMES).map(([key, theme]) => (
                  <button
                    key={key}
                    type="button"
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
          </div>
        )}

        {activeTab === "props" && (
          <EditorChoiceGrid
            label="Photo props"
            value={sticker}
            onChange={setSticker}
            options={(
              Object.entries(stickers) as [StickerKey, StickerDef][]
            ).map(([value, item]) => ({
              value,
              label:
                isPremiumSticker(value) && !isPro
                  ? `${item.label} Pro`
                  : item.label,
            }))}
          />
        )}

        {activeTab === "text" && (
          <div className="space-y-4">
            <div>
              <SectionLabel className="mb-1">Caption</SectionLabel>
              {isPro ? (
                <input
                  value={customCaption}
                  maxLength={STYLE_CAPTION_MAX}
                  onChange={(e) => onCustomCaption(e.target.value)}
                  placeholder="BoothBop"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  enterKeyHint="done"
                  className="h-11 w-full border-2 border-ink bg-paper px-3 font-sans text-base text-ink outline-none focus:ring-4 focus:ring-orange/35"
                />
              ) : (
                <button
                  type="button"
                  onClick={onOpenPro}
                  className="flex min-h-11 w-full items-center justify-between border-2 border-ink bg-cream px-3 py-2 text-left transition active:translate-y-px"
                >
                  <span className="font-sans text-sm text-brown">
                    Custom footer text is Pro.
                  </span>
                  <span className="font-display text-base uppercase tracking-wide text-orange-dark">
                    Pro
                  </span>
                </button>
              )}
            </div>

            {canManageSession && (
              <div className="flex w-full items-end gap-2">
                <label className="min-w-0 flex-1">
                  <SectionLabel className="mb-1">Session</SectionLabel>
                  <input
                    value={sessionTitle}
                    maxLength={SESSION_TITLE_MAX}
                    onChange={(e) => onSessionTitle(e.target.value)}
                    placeholder="Name this set"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="words"
                    spellCheck={false}
                    enterKeyHint="done"
                    className="h-11 w-full border-2 border-ink bg-paper px-3 font-sans text-base text-ink outline-none focus:ring-4 focus:ring-orange/35"
                  />
                </label>
                <button
                  type="button"
                  onClick={onToggleFavorite}
                  aria-label={sessionFavorite ? "Unfavorite" : "Favorite"}
                  aria-pressed={sessionFavorite}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center border-2 border-ink transition active:translate-y-px ${
                    sessionFavorite
                      ? "bg-mustard text-ink"
                      : "bg-paper text-ink"
                  }`}
                >
                  <StarIcon className="h-6 w-6" filled={sessionFavorite} />
                </button>
              </div>
            )}

            {autosaveTip && (
              <Callout
                tone="info"
                className="flex w-full items-center gap-2 px-3 py-2 text-left"
              >
                <p className="flex-1 font-sans text-xs text-ink">
                  Auto-save photos to a BoothBop album.{" "}
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="font-semibold text-teal underline"
                  >
                    Settings
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
          </div>
        )}

        {activeTab === "shots" && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {thumbs.map((src, i) => (
                <div key={i} className="min-w-0">
                  <button
                    type="button"
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

            <Button variant="secondary" size="md" fullWidth onClick={onRetake}>
              <RefreshIcon className="h-6 w-6" />
              Take Again
            </Button>
          </div>
        )}

        {activeTab === "templates" && (
          <div className="space-y-3">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={onBrowseTemplates}
            >
              Browse Template Gallery
            </Button>
            <div className="grid grid-cols-2 gap-2">
              {stylePresets.map((preset) => {
                const locked = preset.pro && !isPro;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onApplyPreset(preset)}
                    className={`min-h-[58px] border-2 border-ink px-2 py-2 font-display text-sm uppercase tracking-wide transition active:translate-y-px ${
                      locked ? "bg-cream text-brown" : "bg-paper text-ink"
                    }`}
                  >
                    <span className="block leading-none">{preset.label}</span>
                    <span className="mt-1 block font-sans text-[10px] font-bold uppercase tracking-wide text-brown">
                      {stylePresetMetaLabel(preset)}
                      {preset.pro ? " / Pro" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
