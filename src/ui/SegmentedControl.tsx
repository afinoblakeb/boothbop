import type { ReactNode } from "react";

export interface SegmentOption<T> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

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
      className={`flex gap-1 rounded-lg bg-surface-muted p-1 ${
        fullWidth ? "w-full" : "w-max"
      } ${className}`}
    >
      {options.map((o, index) => {
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
            tabIndex={ariaRole === "tab" ? (selected ? 0 : -1) : undefined}
            onKeyDown={(event) => {
              if (ariaRole !== "tab") return;
              const delta =
                event.key === "ArrowRight"
                  ? 1
                  : event.key === "ArrowLeft"
                    ? -1
                    : 0;
              if (!delta) return;
              event.preventDefault();
              let next = index;
              do {
                next = (next + delta + options.length) % options.length;
              } while (options[next].disabled && next !== index);
              const group = event.currentTarget.parentElement;
              onChange(options[next].value);
              requestAnimationFrame(() => {
                const tabs =
                  group?.querySelectorAll<HTMLElement>('[role="tab"]');
                tabs?.[next]?.focus();
              });
            }}
            {...a11y}
            className={`min-h-10 rounded-md px-3 font-sans font-semibold tracking-normal outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-accent ${
              fullWidth ? "flex-1" : ""
            } ${
              selected
                ? "bg-surface text-text shadow-control"
                : "text-text-muted active:bg-surface/70"
            } ${itemClassName}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
