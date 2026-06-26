import { useEffect, useMemo, useState } from "react";
import { composeStrip, THEMES } from "../lib/strip";
import {
  PREVIEW_DEMO_SET,
  TEMPLATE_CATEGORIES,
  presetsByCategory,
  type StylePreset,
  type TemplateCategory,
} from "../lib/templates";
import { Button, Callout, Heading, OverlayScreen } from "../ui";

type DemoSet = 1 | 2 | 3;
type FramesBySet = Partial<Record<DemoSet, HTMLCanvasElement[]>>;

const ALL_CATEGORY = "all";
type CategoryFilter = TemplateCategory | typeof ALL_CATEGORY;

const CATEGORY_OPTIONS: { id: CategoryFilter; label: string }[] = [
  { id: ALL_CATEGORY, label: "All" },
  ...TEMPLATE_CATEGORIES,
];

export function TemplateGalleryScreen({
  isPro,
  hasCurrentCapture,
  onClose,
  onStart,
  onApplyToCurrent,
  onUnlockPro,
}: {
  isPro: boolean;
  hasCurrentCapture: boolean;
  onClose: () => void;
  onStart: (preset: StylePreset) => void;
  onApplyToCurrent: (preset: StylePreset) => void;
  onUnlockPro: (preset: StylePreset) => void;
}) {
  const [category, setCategory] = useState<CategoryFilter>(ALL_CATEGORY);
  const [framesBySet, setFramesBySet] = useState<FramesBySet>({});
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<StylePreset | null>(null);
  const visiblePresets = presetsByCategory(category);

  useEffect(() => {
    let active = true;
    import("../lib/demo")
      .then(async ({ loadSampleFrames }) => {
        const entries = await Promise.all(
          ([1, 2, 3] as const).map(async (setNum) => [
            setNum,
            await loadSampleFrames(setNum, 420),
          ]),
        );
        if (active) setFramesBySet(Object.fromEntries(entries) as FramesBySet);
      })
      .catch(() => {
        if (active) setError("Couldn't load template previews.");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <OverlayScreen
      title={selected ? selected.label : "Templates"}
      onClose={onClose}
    >
      {selected ? (
        <TemplateDetail
          preset={selected}
          framesBySet={framesBySet}
          isPro={isPro}
          hasCurrentCapture={hasCurrentCapture}
          onBack={() => setSelected(null)}
          onStart={onStart}
          onApplyToCurrent={onApplyToCurrent}
          onUnlockPro={onUnlockPro}
        />
      ) : (
        <>
          <p className="mt-1 font-sans text-xs uppercase tracking-wide text-warmgray">
            Pick a look, preview it with real demo photos, then start shooting.
          </p>

          {error && (
            <Callout tone="error" className="mt-4 px-3 py-2">
              <p className="font-sans text-sm text-orange-dark">{error}</p>
            </Callout>
          )}

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {CATEGORY_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => setCategory(option.id)}
                aria-pressed={category === option.id}
                className={`min-h-11 shrink-0 border-2 border-ink px-3 font-display text-base uppercase tracking-wide transition active:translate-y-px ${
                  category === option.id
                    ? "bg-orange text-cream"
                    : "bg-paper text-ink"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {visiblePresets.map((preset) => (
              <TemplateCard
                key={preset.id}
                preset={preset}
                framesBySet={framesBySet}
                locked={preset.pro && !isPro}
                onOpen={() => setSelected(preset)}
              />
            ))}
          </div>
        </>
      )}
    </OverlayScreen>
  );
}

function TemplateCard({
  preset,
  framesBySet,
  locked,
  onOpen,
}: {
  preset: StylePreset;
  framesBySet: FramesBySet;
  locked: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className="overflow-hidden border-2 border-ink bg-paper text-left transition active:translate-y-px"
    >
      <div className="flex aspect-[4/5] items-center justify-center bg-cream p-3">
        <TemplatePreview
          preset={preset}
          framesBySet={framesBySet}
          cell={120}
          className="max-h-full max-w-full"
        />
      </div>
      <div className="border-t-2 border-ink px-2 py-2">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <Heading as="span" size="sm" className="min-w-0 truncate text-ink">
            {preset.label}
          </Heading>
          <span
            className={`shrink-0 border-2 px-1.5 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wide ${
              locked
                ? "border-orange-dark text-orange-dark"
                : "border-teal text-teal"
            }`}
          >
            {preset.pro ? "Pro" : "Free"}
          </span>
        </div>
        <p className="mt-1 font-sans text-[11px] uppercase tracking-wide text-warmgray">
          {preset.category} / {preset.layout}
        </p>
      </div>
    </button>
  );
}

function TemplateDetail({
  preset,
  framesBySet,
  isPro,
  hasCurrentCapture,
  onBack,
  onStart,
  onApplyToCurrent,
  onUnlockPro,
}: {
  preset: StylePreset;
  framesBySet: FramesBySet;
  isPro: boolean;
  hasCurrentCapture: boolean;
  onBack: () => void;
  onStart: (preset: StylePreset) => void;
  onApplyToCurrent: (preset: StylePreset) => void;
  onUnlockPro: (preset: StylePreset) => void;
}) {
  const locked = preset.pro && !isPro;
  const chips = [
    preset.layout,
    preset.filter,
    preset.sticker,
    preset.caption ?? null,
  ].filter(Boolean);

  return (
    <>
      <button
        onClick={onBack}
        className="mt-3 min-h-11 font-display text-base uppercase tracking-wide text-brown underline decoration-2 underline-offset-4"
      >
        Back to templates
      </button>

      <div className="mt-4 flex min-h-[360px] items-center justify-center border-2 border-ink bg-paper p-4">
        <TemplatePreview
          preset={preset}
          framesBySet={framesBySet}
          cell={220}
          className="max-h-[52vh] max-w-full"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <span
            key={String(chip)}
            className="border-2 border-ink bg-paper px-2 py-1 font-sans text-xs font-bold uppercase tracking-wide text-brown"
          >
            {chip}
          </span>
        ))}
        <span
          className={`border-2 px-2 py-1 font-sans text-xs font-bold uppercase tracking-wide ${
            locked
              ? "border-orange-dark text-orange-dark"
              : "border-teal text-teal"
          }`}
        >
          {preset.pro ? "Pro" : "Free"}
        </span>
      </div>

      {locked && (
        <Callout tone="info" className="mt-4 px-3 py-2">
          <p className="font-sans text-sm text-ink">
            Full preview shown. Unlock Pro to use this template.
          </p>
        </Callout>
      )}

      <div className="mt-4 grid gap-3">
        <Button
          variant="primary"
          size="md"
          fullWidth
          onClick={() => (locked ? onUnlockPro(preset) : onStart(preset))}
        >
          {locked ? "Unlock with Pro" : "Start Booth"}
        </Button>
        {hasCurrentCapture && (
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() =>
              locked ? onUnlockPro(preset) : onApplyToCurrent(preset)
            }
          >
            {locked ? "Unlock to Apply" : "Apply to Current Strip"}
          </Button>
        )}
      </div>
    </>
  );
}

function TemplatePreview({
  preset,
  framesBySet,
  cell,
  className = "",
}: {
  preset: StylePreset;
  framesBySet: FramesBySet;
  cell: number;
  className?: string;
}) {
  const frames = framesBySet[PREVIEW_DEMO_SET[preset.id] ?? 3];
  const url = useMemo(() => {
    if (!frames) return null;
    return composeStrip(frames, preset.layout, THEMES[preset.theme], {
      cell,
      watermark: false,
      filter: preset.filter,
      sticker: preset.sticker,
      caption: preset.caption,
    }).toDataURL("image/png");
  }, [cell, frames, preset]);

  if (!url) {
    return (
      <div className="flex h-full min-h-32 w-full items-center justify-center border-2 border-ink bg-paper font-display text-sm uppercase tracking-wide text-brown">
        Loading
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={`${preset.label} template preview`}
      className={`object-contain ${className}`}
      draggable={false}
    />
  );
}
