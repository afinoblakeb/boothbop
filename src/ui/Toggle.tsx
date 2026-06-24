// Small brand-styled on/off switch.
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
