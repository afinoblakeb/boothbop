import type { ReactNode } from "react";

export interface SegmentOption<T> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

// A connected pick-one control — the bordered group with the orange "selected"
// state — used for the format tabs, layout, and countdown. Centralizes the
// frame, the selected/unselected coloring, and the ARIA wiring; per-context
// item padding/size is passed via `itemClassName`. `ariaRole="tab"` makes it a
// tablist; otherwise it's a radio-style group.
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  fullWidth = false,
  ariaRole = "radio",
  label,
  itemClassName = "",
  className = "",
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  fullWidth?: boolean;
  ariaRole?: "radio" | "tab";
  label?: string;
  itemClassName?: string;
  className?: string;
}) {
  return (
    <div
      role={ariaRole === "tab" ? "tablist" : "group"}
      aria-label={label}
      className={`flex divide-x-2 divide-ink border-2 border-ink bg-paper ${
        fullWidth ? "w-full" : "w-max"
      } ${className}`}
    >
      {options.map((o) => {
        const selected = o.value === value;
        const a11y =
          ariaRole === "tab"
            ? { role: "tab" as const, "aria-selected": selected }
            : { "aria-pressed": selected };
        return (
          <button
            key={String(o.value)}
            onClick={() => onChange(o.value)}
            disabled={o.disabled}
            {...a11y}
            className={`font-display uppercase tracking-wide transition ${
              fullWidth ? "flex-1" : ""
            } ${selected ? "bg-orange text-cream" : "text-ink"} ${itemClassName}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
