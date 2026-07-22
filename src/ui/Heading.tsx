import type { ElementType, ReactNode } from "react";

export type HeadingSize = "xl" | "lg" | "md" | "sm";
export type HeadingVariant = "page" | "section" | "brand";

const SIZE: Record<HeadingSize, string> = {
  xl: "text-3xl",
  lg: "text-2xl",
  md: "text-xl",
  sm: "text-lg",
};

export function Heading({
  as: As = "h2",
  size = "lg",
  variant = "section",
  className = "",
  children,
}: {
  as?: ElementType;
  size?: HeadingSize;
  variant?: HeadingVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <As
      className={`${
        variant === "brand"
          ? "font-display uppercase tracking-normal"
          : variant === "page"
            ? "font-sans font-bold tracking-normal"
            : "font-sans font-semibold tracking-normal"
      } ${SIZE[size]} ${className}`}
    >
      {children}
    </As>
  );
}
