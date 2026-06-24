import type { ButtonHTMLAttributes, ReactNode } from "react";

// An icon-only button that always meets the 44pt minimum tap target. Appearance
// (border, background, text color) is supplied by className so it adapts to its
// context (bordered top-bar control vs. bare ✕), while the accessible size and
// centering are guaranteed here. `aria-label` is required.
//
// `compact` drops the 44pt floor so the button can match an adjacent control's
// height exactly (the className must then set an explicit size). Use sparingly —
// only where visual alignment outweighs the slightly smaller target.
export function IconButton({
  "aria-label": label,
  compact = false,
  className = "",
  children,
  ...props
}: {
  "aria-label": string;
  compact?: boolean;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      aria-label={label}
      className={`inline-flex items-center justify-center ${
        compact ? "" : "min-h-[44px] min-w-[44px]"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
