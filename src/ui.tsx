// Shared presentational atoms: the two brand button styles + the on/off switch.

/** Primary (orange) action button — the one dominant CTA per screen. */
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 border-2 border-ink bg-orange text-cream font-display text-2xl uppercase tracking-wide transition active:bg-orange-dark active:translate-y-px disabled:opacity-40";

/** Secondary (paper) action button. */
export const btnSecondary =
  "inline-flex items-center justify-center gap-2 border-2 border-ink bg-paper text-ink font-display text-xl uppercase tracking-wide transition active:bg-cream active:translate-y-px disabled:opacity-40";

/** Small brand-styled on/off switch. */
export function Toggle({
  on,
  disabled,
  onChange,
}: {
  on: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 border-2 border-ink transition disabled:opacity-40 ${
        on ? "bg-orange" : "bg-cream"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 bg-ink transition-all ${
          on ? "left-[1.375rem]" : "left-0.5"
        }`}
      />
    </button>
  );
}
