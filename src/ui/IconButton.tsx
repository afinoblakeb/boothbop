import type { ButtonHTMLAttributes, ReactNode } from "react";

// An icon-only button that always meets the 44pt minimum tap target. Appearance
// (border, background, text color) is supplied by className so it adapts to its
// context (bordered top-bar control vs. bare ✕), while the accessible size and
// centering are guaranteed here. `aria-label` is required.
export function IconButton({
  "aria-label": label,
  className = "",
  children,
  ...props
}: {
  "aria-label": string;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      aria-label={label}
      className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
