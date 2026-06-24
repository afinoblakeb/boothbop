import type { ElementType, ReactNode } from "react";

// The one display-type treatment — `font-display uppercase tracking-wide` — at
// four sizes. Centralizes the brand heading look so every title, section header,
// and emphatic label reads as one family. Color and spacing are passed via
// `className`; `as` keeps the right semantic element (h2/h3/p/span).
export type HeadingSize = "xl" | "lg" | "md" | "sm";

const SIZE: Record<HeadingSize, string> = {
  xl: "text-3xl",
  lg: "text-2xl",
  md: "text-xl",
  sm: "text-lg",
};

export function Heading({
  as: As = "h2",
  size = "lg",
  className = "",
  children,
}: {
  as?: ElementType;
  size?: HeadingSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <As
      className={`font-display uppercase tracking-wide ${SIZE[size]} ${className}`}
    >
      {children}
    </As>
  );
}
