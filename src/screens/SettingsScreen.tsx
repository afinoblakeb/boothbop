import {
  type AutosaveDest,
  type AutosaveFormat,
  type AutosaveSettings,
  type Quality,
  type QualityMedia,
  type QualitySettings,
} from "../lib/settings";
import type { RuntimeFeatureFlags } from "../lib/remoteConfig";
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

/** Full-screen Settings overlay: the auto-save-to-Photos controls. */
export function SettingsScreen({
  settings,
  quality,
  native,
  videoSupported,
  error,
  onDest,
  onToggle,
  onQuality,
  onOpenIosSettings,
  onClose,
  branding,
  onBranding,
  features,
}: {
  settings: AutosaveSettings;
  quality: QualitySettings;
  native: boolean;
  videoSupported: boolean;
  error: string | null;
  onDest: (dest: AutosaveDest) => void;
  onToggle: (format: AutosaveFormat, on: boolean) => void;
  onQuality: (media: QualityMedia, q: Quality) => void;
  onOpenIosSettings: () => void;
  onClose: () => void;
  branding: boolean;
  onBranding: (on: boolean) => void;
  features: RuntimeFeatureFlags;
}) {
  const allFormats: {
    key: AutosaveFormat;
    label: string;
    disabled?: boolean;
  }[] = [
    { key: "strip", label: "Photo strip" },
    { key: "grid", label: "Grid (2×2)" },
    { key: "gif", label: "Animated GIF" },
    { key: "video", label: "Looping video", disabled: !videoSupported },
  ];
  const formats = allFormats.filter(
    ({ key }) =>
      (key !== "gif" || features.gif) && (key !== "video" || features.video),
  );

  const qualityRows: { key: QualityMedia; label: string }[] = [
    { key: "photo", label: "Photo strip" },
    ...(features.gif
      ? [{ key: "gif" as QualityMedia, label: "Animated GIF" }]
      : []),
    ...(videoSupported
      ? [{ key: "video" as QualityMedia, label: "Looping video" }]
      : []),
  ];

  return (
    <OverlayScreen title="Settings" onClose={onClose}>
      {features.brandingControl && (
        <>
          <Heading as="h3" size="lg" className="mt-6">
            Exports
          </Heading>
          <div className="mt-3 flex items-center justify-between border-2 border-ink bg-paper px-4 py-3">
            <div className="pr-4">
              <Heading as="span" size="md">
                BoothBop branding
              </Heading>
              <p className="font-sans text-xs text-warmgray">
                Show the logo on saved photos and animations.
              </p>
            </div>
            <Toggle on={branding} onChange={onBranding} />
          </div>
        </>
      )}

      <Heading as="h3" size="lg" className="mt-6">
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
              options={QUALITY_OPTIONS}
              itemClassName="py-2 text-sm"
            />
          </div>
        ))}
      </div>

      <LegalFooter className="mt-10 text-center" />
    </OverlayScreen>
  );
}
