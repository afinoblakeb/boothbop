import {
  type AutosaveDest,
  type AutosaveFormat,
  type AutosaveSettings,
} from "../lib/settings";
import type { RuntimeFeatureFlags } from "../lib/remoteConfig";
import {
  Button,
  Callout,
  OverlayScreen,
  SegmentedControl,
  Toggle,
} from "../ui";
import { LegalFooter } from "../components/LegalFooter";

/** Full-screen Settings overlay: the auto-save-to-Photos controls. */
export function SettingsScreen({
  settings,
  native,
  videoSupported,
  error,
  onDest,
  onToggle,
  onOpenIosSettings,
  onClose,
  branding,
  onBranding,
  features,
}: {
  settings: AutosaveSettings;
  native: boolean;
  videoSupported: boolean;
  error: string | null;
  onDest: (dest: AutosaveDest) => void;
  onToggle: (format: AutosaveFormat, on: boolean) => void;
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

  return (
    <OverlayScreen title="Settings" onClose={onClose}>
      {features.brandingControl && (
        <section className="mt-6" aria-labelledby="exports-heading">
          <h3
            id="exports-heading"
            className="font-sans text-sm font-semibold text-text"
          >
            Exports
          </h3>
          <div className="mt-2 flex min-h-16 items-center justify-between rounded-lg border border-border bg-surface px-4 py-2 shadow-control">
            <div className="pr-4">
              <p className="font-sans text-[15px] font-medium text-text">
                BoothBop branding
              </p>
              <p className="mt-0.5 font-sans text-xs leading-4 text-text-muted">
                Show the logo on saved photos and animations.
              </p>
            </div>
            <Toggle
              aria-label="BoothBop branding"
              on={branding}
              onChange={onBranding}
            />
          </div>
        </section>
      )}

      <section className="mt-7" aria-labelledby="autosave-heading">
        <h3
          id="autosave-heading"
          className="font-sans text-sm font-semibold text-text"
        >
          Auto-save to Photos
        </h3>
        <p className="mt-1 font-sans text-sm leading-5 text-text-muted">
          Save your booth creations to the iOS Photos app automatically.
        </p>

        {!native ? (
          <Callout
            as="p"
            tone="neutral"
            className="mt-4 px-4 py-3 font-sans text-sm text-text-muted"
          >
            Available in the BoothBop iOS app.
          </Callout>
        ) : (
          <>
            <div className="mt-5">
              <p className="font-sans text-xs font-semibold text-text-muted">
                Save to
              </p>
              <SegmentedControl
                label="Save to"
                options={[
                  { value: "album", label: "BoothBop album" },
                  { value: "cameraRoll", label: "Camera roll" },
                ]}
                value={settings.dest}
                onChange={(value: AutosaveDest) => onDest(value)}
                fullWidth
                itemClassName="min-h-11 text-sm"
                className="mt-2"
              />
              <p className="mt-2 font-sans text-xs leading-4 text-text-muted">
                {settings.dest === "album"
                  ? "Creates a dedicated “BoothBop” album. Needs full Photos access — we only ever add to that album."
                  : "Saves into your main camera roll."}
              </p>
            </div>

            <ul className="mt-5 overflow-hidden rounded-lg border border-border bg-surface shadow-control">
              {formats.map((f, index) => (
                <li
                  key={f.key}
                  className={`flex min-h-14 items-center justify-between px-4 py-1 ${
                    index > 0 ? "border-t border-border" : ""
                  }`}
                >
                  <span
                    className={`font-sans text-[15px] font-medium ${
                      f.disabled ? "text-text-muted" : "text-text"
                    }`}
                  >
                    {f.label}
                  </span>
                  <Toggle
                    aria-label={`Auto-save ${f.label}`}
                    on={settings[f.key]}
                    disabled={f.disabled}
                    onChange={(v) => onToggle(f.key, v)}
                  />
                </li>
              ))}
            </ul>
            <p className="mt-3 font-sans text-xs leading-4 text-text-muted">
              BoothBop only adds your own creations — it never reads or uploads
              your library.
            </p>

            <button
              onClick={onOpenIosSettings}
              className="mt-2 min-h-11 rounded-md font-sans text-xs font-medium text-text-muted underline decoration-border-strong underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Manage Photos permissions in iOS Settings →
            </button>

            {error && (
              <Callout tone="error" className="mt-3 px-3 py-3">
                <p className="font-sans text-xs leading-4 text-critical">
                  {error}
                </p>
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
      </section>

      <LegalFooter className="mt-10 text-center" />
    </OverlayScreen>
  );
}
