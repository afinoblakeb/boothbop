import type { ReactNode } from "react";

// The small all-caps field/section label — `text-xs font-bold uppercase
// tracking-widest text-warmgray`. Used above the strip controls and anywhere a
// quiet caption labels a group. Spacing/alignment (mb-1, text-center) is passed
// via `className`.
export function SectionLabel({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      className={`font-sans text-xs font-bold uppercase tracking-widest text-warmgray ${className}`}
    >
      {children}
    </p>
  );
}
