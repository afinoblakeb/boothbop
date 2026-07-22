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
      className="inline-flex h-11 w-14 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-40"
    >
      <span
        className={`relative h-7 w-12 rounded-full transition-colors duration-200 ${
          on ? "bg-accent" : "bg-border-strong"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-control transition-all duration-200 ${
            on ? "left-6" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}
