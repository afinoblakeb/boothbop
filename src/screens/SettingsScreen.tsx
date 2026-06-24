import {
  type AutosaveDest,
  type AutosaveFormat,
  type AutosaveSettings,
} from "../lib/settings";
import { Toggle } from "../ui";

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
    <div className="fixed inset-0 z-40 overflow-y-auto bg-cream text-ink">
      <div className="mx-auto max-w-md px-4 pb-10 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-3xl uppercase tracking-wide">
            Settings
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-2 text-2xl text-brown"
          >
            ✕
          </button>
        </div>

        <h3 className="mt-6 font-display text-2xl uppercase tracking-wide">
          Auto-save to Photos
        </h3>
        <p className="mt-1 font-sans text-xs uppercase tracking-wide text-warmgray">
          Save your booth creations to the iOS Photos app automatically.
        </p>

        {!native ? (
          <p className="mt-4 border-2 border-ink/30 bg-paper px-4 py-3 font-sans text-sm text-brown">
            Available in the BoothBop iOS app.
          </p>
        ) : (
          <>
            <div className="mt-4">
              <p className="font-display text-lg uppercase tracking-wide text-brown">
                Save to
              </p>
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
                  <span
                    className={`font-display text-xl uppercase tracking-wide ${
                      f.disabled ? "text-warmgray" : "text-ink"
                    }`}
                  >
                    {f.label}
                  </span>
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
              <div className="mt-3 border-2 border-orange-dark bg-orange/10 px-3 py-2">
                <p className="font-sans text-xs text-orange-dark">{error}</p>
                <button
                  onClick={onOpenIosSettings}
                  className="mt-2 inline-flex items-center border-2 border-orange-dark bg-paper px-3 py-1.5 font-display text-sm uppercase tracking-wide text-orange-dark transition active:translate-y-px active:bg-cream"
                >
                  Open iOS Settings
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
