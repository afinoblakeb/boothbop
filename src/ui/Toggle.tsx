// Small brand-styled on/off switch.
export function Toggle({
  on,
  disabled,
  onChange,
  "aria-label": label,
}: {
  on: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  "aria-label": string;
}) {
  return (
    <button
      role="switch"
      aria-label={label}
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-11 w-14 shrink-0 border-2 border-ink transition disabled:opacity-40 ${
        on ? "bg-orange" : "bg-cream"
      }`}
    >
      <span
        className={`absolute top-2 h-6 w-6 bg-ink transition-all ${
          on ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}
