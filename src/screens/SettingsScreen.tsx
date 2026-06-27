import {
  EXPORT_SPEEDS,
  type AutosaveDest,
  type AutosaveFormat,
  type AutosaveSettings,
  type ExportSpeed,
  type Quality,
  type QualityMedia,
  type QualitySettings,
} from "../lib/settings";
import { PARTY_RESET_SECONDS, type PartyResetSeconds } from "../lib/partyMode";
import { proPriceLabel } from "../lib/pro";
import { STYLE_CAPTION_MAX } from "../lib/style";
import {
  Button,
  Callout,
  Heading,
  OverlayScreen,
  SegmentedControl,
  Toggle,
} from "../ui";
import { LegalFooter } from "../components/LegalFooter";

const QUALITY_OPTIONS: { value: Quality; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "standard", label: "Standard" },
  { value: "high", label: "High" },
];

const SPEED_LABELS: Record<ExportSpeed, string> = {
  slow: "Slow",
  normal: "Normal",
  fast: "Fast",
};

/** Full-screen Settings overlay: the auto-save-to-Photos controls. */
export function SettingsScreen({
  settings,
  quality,
  exportSpeed,
  native,
  videoSupported,
  error,
  isPro,
  proPrice,
  partyMode,
  partyPasscode,
  partyResetSeconds,
  eventName,
  onDest,
  onToggle,
  onQuality,
  onExportSpeed,
  onOpenPro,
  onOpenPartyMode,
  onPartyMode,
  onPartyPasscode,
  onPartyResetSeconds,
  onEventName,
  onRestorePurchase,
  onOpenIosSettings,
  onClose,
}: {
  settings: AutosaveSettings;
  quality: QualitySettings;
  exportSpeed: ExportSpeed;
  native: boolean;
  videoSupported: boolean;
  error: string | null;
  isPro: boolean;
  proPrice: string | null;
  partyMode: boolean;
  partyPasscode: string;
  partyResetSeconds: PartyResetSeconds;
  eventName: string;
  onDest: (dest: AutosaveDest) => void;
  onToggle: (format: AutosaveFormat, on: boolean) => void;
  onQuality: (media: QualityMedia, q: Quality) => void;
  onExportSpeed: (speed: ExportSpeed) => void;
  onOpenPro: () => void;
  onOpenPartyMode: () => void;
  onPartyMode: (on: boolean) => void;
  onPartyPasscode: (passcode: string) => void;
  onPartyResetSeconds: (seconds: PartyResetSeconds) => void;
  onEventName: (name: string) => void;
  onRestorePurchase: () => void;
  onOpenIosSettings: () => void;
  onClose: () => void;
}) {
  const formats: { key: AutosaveFormat; label: string; disabled?: boolean }[] =
    [
      { key: "strip", label: "Photo strip" },
      { key: "grid", label: "Grid (2×2)" },
      { key: "gif", label: "Animated GIF" },
      { key: "video", label: "Looping video", disabled: !videoSupported },
    ];

  const qualityRows: { key: QualityMedia; label: string }[] = [
    { key: "photo", label: "Photo strip" },
    { key: "gif", label: "Animated GIF" },
    ...(videoSupported
      ? [{ key: "video" as QualityMedia, label: "Looping video" }]
      : []),
  ];

  return (
    <OverlayScreen title="Settings" onClose={onClose}>
      {native && (
        <>
          <Heading as="h3" size="lg" className="mt-6">
            BoothBop Pro
          </Heading>
          <p className="mt-1 font-sans text-xs uppercase tracking-wide text-warmgray">
            Premium templates, custom captions, print sheets, HD exports, guest
            mode extras, and watermark-free saved outputs.
          </p>
          {isPro ? (
            <Callout
              as="p"
              tone="info"
              className="mt-4 px-4 py-3 font-sans text-sm text-ink"
            >
              Pro active. Premium creative tools, guest flows, print sheets, HD
              exports, and watermark-free saved outputs are enabled.
            </Callout>
          ) : (
            <div className="mt-4">
              <Button variant="primary" size="md" fullWidth onClick={onOpenPro}>
                Start Pro - {proPriceLabel(proPrice)}
              </Button>
              <button
                onClick={onRestorePurchase}
                className="mt-3 font-sans text-xs text-warmgray underline"
              >
                Restore purchase
              </button>
            </div>
          )}
        </>
      )}

      <Heading as="h3" size="lg" className="mt-8">
        Party Mode
      </Heading>
      <p className="mt-1 font-sans text-xs uppercase tracking-wide text-warmgray">
        Keep the selected template, look, props, and caption ready between
        guests.
      </p>
      <div className="mt-4 flex items-center justify-between border-2 border-ink bg-paper px-4 py-3">
        <div className="min-w-0 pr-4">
          <Heading as="p" size="md" className="text-ink">
            Next Guest Flow
          </Heading>
          <p className="mt-1 font-sans text-xs leading-snug text-brown">
            Review switches to Next Guest so a host can run another booth set
            without rebuilding the event style.
          </p>
        </div>
        {isPro ? (
          <Toggle on={partyMode} onChange={onPartyMode} />
        ) : (
          <button
            onClick={onOpenPartyMode}
            className="shrink-0 border-2 border-ink bg-cream px-3 py-2 font-display text-base uppercase tracking-wide text-orange-dark transition active:translate-y-px"
          >
            Pro
          </button>
        )}
      </div>
      {isPro && (
        <div className="mt-3 grid gap-4">
          <label className="block">
            <Heading as="span" size="sm" className="text-brown">
              Event name
            </Heading>
            <input
              value={eventName}
              maxLength={STYLE_CAPTION_MAX}
              onChange={(e) => onEventName(e.target.value)}
              placeholder="Acme Gala"
              className="mt-1 h-11 w-full border-2 border-ink bg-paper px-3 font-sans text-base text-ink outline-none focus:ring-4 focus:ring-orange/35"
              aria-label="Party Mode event name"
            />
            <p className="mt-1 font-sans text-xs text-warmgray">
              Brand-ready templates use this for the {"{brand}"} footer.
            </p>
          </label>
          <label className="block">
            <Heading as="span" size="sm" className="text-brown">
              Host exit code
            </Heading>
            <input
              value={partyPasscode}
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              onChange={(e) => onPartyPasscode(e.target.value)}
              disabled={partyMode}
              className="mt-1 h-11 w-full border-2 border-ink bg-paper px-3 text-center font-display text-2xl tracking-wide text-ink outline-none focus:ring-4 focus:ring-orange/35 disabled:opacity-50"
              aria-label="Party Mode host exit code"
            />
            <p className="mt-1 font-sans text-xs text-warmgray">
              {partyMode
                ? "Turn Party Mode off to change the code."
                : "BoothBop gates the app UI. Use iOS Guided Access to lock the device."}
            </p>
          </label>
          <div>
            <Heading as="p" size="sm" className="text-brown">
              Auto-reset review
            </Heading>
            <SegmentedControl
              fullWidth
              className="mt-1.5"
              label="Party Mode auto-reset"
              value={partyResetSeconds}
              onChange={onPartyResetSeconds}
              options={PARTY_RESET_SECONDS.map((seconds) => ({
                value: seconds,
                label: seconds === 0 ? "Off" : `${seconds}s`,
              }))}
              itemClassName="py-2 text-sm"
            />
          </div>
        </div>
      )}

      <Heading as="h3" size="lg" className="mt-8">
        Auto-save to Photos
      </Heading>
      <p className="mt-1 font-sans text-xs uppercase tracking-wide text-warmgray">
        Save your booth creations to the iOS Photos app automatically.
      </p>

      {!native ? (
        <Callout
          as="p"
          tone="neutral"
          className="mt-4 px-4 py-3 font-sans text-sm text-brown"
        >
          Available in the BoothBop iOS app.
        </Callout>
      ) : (
        <>
          <div className="mt-4">
            <Heading as="p" size="sm" className="text-brown">
              Save to
            </Heading>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["album", "cameraRoll"] as AutosaveDest[]).map((d) => (
                <button
                  key={d}
                  onClick={() => onDest(d)}
                  aria-pressed={settings.dest === d}
                  className={`border-2 border-ink px-3 py-2 font-display text-base uppercase tracking-wide transition active:translate-y-px ${
                    settings.dest === d
                      ? "bg-orange text-cream"
                      : "bg-paper text-ink"
                  }`}
                >
                  {d === "album" ? "BoothBop album" : "Camera roll"}
                </button>
              ))}
            </div>
            <p className="mt-1 font-sans text-xs text-warmgray">
              {settings.dest === "album"
                ? "Creates a dedicated “BoothBop” album. Needs full Photos access — we only ever add to that album."
                : "Saves into your main camera roll."}
            </p>
          </div>

          <ul className="mt-5 divide-y-2 divide-ink/10 border-2 border-ink bg-paper">
            {formats.map((f) => (
              <li
                key={f.key}
                className="flex items-center justify-between px-4 py-3"
              >
                <Heading
                  as="span"
                  size="md"
                  className={f.disabled ? "text-warmgray" : "text-ink"}
                >
                  {f.label}
                </Heading>
                <Toggle
                  on={settings[f.key]}
                  disabled={f.disabled}
                  onChange={(v) => onToggle(f.key, v)}
                />
              </li>
            ))}
          </ul>
          <p className="mt-3 font-sans text-xs text-warmgray">
            BoothBop only adds your own creations — it never reads or uploads
            your library.
          </p>

          <button
            onClick={onOpenIosSettings}
            className="mt-3 font-sans text-xs text-warmgray underline"
          >
            Manage Photos permissions in iOS Settings →
          </button>

          {error && (
            <Callout tone="error" className="mt-3 px-3 py-2">
              <p className="font-sans text-xs text-orange-dark">{error}</p>
              <Button
                variant="danger"
                size="sm"
                onClick={onOpenIosSettings}
                className="mt-2"
              >
                Open iOS Settings
              </Button>
            </Callout>
          )}
        </>
      )}

      <Heading as="h3" size="lg" className="mt-8">
        Export quality
      </Heading>
      <p className="mt-1 font-sans text-xs uppercase tracking-wide text-warmgray">
        Higher quality is sharper but makes bigger files to save and share.
      </p>

      <div className="mt-4 space-y-4">
        {qualityRows.map((row) => (
          <div key={row.key}>
            <Heading as="p" size="sm" className="text-brown">
              {row.label}
            </Heading>
            <SegmentedControl
              fullWidth
              className="mt-1.5"
              label={`${row.label} quality`}
              value={quality[row.key]}
              onChange={(q) => onQuality(row.key, q)}
              options={QUALITY_OPTIONS.map((option) => ({
                ...option,
                label:
                  option.value === "high" && !isPro ? "High Pro" : option.label,
              }))}
              itemClassName="py-2 text-sm"
            />
          </div>
        ))}
        <div>
          <Heading as="p" size="sm" className="text-brown">
            GIF / video speed
          </Heading>
          <SegmentedControl
            fullWidth
            className="mt-1.5"
            label="Motion export speed"
            value={exportSpeed}
            onChange={onExportSpeed}
            options={EXPORT_SPEEDS.map((speed) => ({
              value: speed,
              label: SPEED_LABELS[speed],
            }))}
            itemClassName="py-2 text-sm"
          />
        </div>
      </div>

      <LegalFooter className="mt-10 text-center" />
    </OverlayScreen>
  );
}
