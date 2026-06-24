import {
  type AutosaveDest,
  type AutosaveFormat,
  type AutosaveSettings,
} from "../lib/settings";
import { Button, Callout, Heading, OverlayScreen, Toggle } from "../ui";

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
}: {
  settings: AutosaveSettings;
  native: boolean;
  videoSupported: boolean;
  error: string | null;
  onDest: (dest: AutosaveDest) => void;
  onToggle: (format: AutosaveFormat, on: boolean) => void;
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

  return (
    <OverlayScreen title="Settings" onClose={onClose}>
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
    </OverlayScreen>
  );
}
