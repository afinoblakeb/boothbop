import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger";
export type ButtonSize = "lg" | "md" | "sm";

// The flat, 2px-ink-border, condensed-display button — BoothBop's one button
// look, parameterized by intent (variant) and scale (size). Pass spacing-only
// extras (mt-*, max-w-*) via className.
const BASE =
  "inline-flex items-center justify-center gap-2 border-2 border-ink font-display uppercase tracking-wide transition active:translate-y-px disabled:opacity-40";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-orange text-cream active:bg-orange-dark",
  secondary: "bg-paper text-ink active:bg-cream",
  danger: "border-orange-dark bg-paper text-orange-dark active:bg-cream",
};

const SIZE: Record<ButtonSize, string> = {
  lg: "px-6 py-3.5 text-2xl",
  md: "px-6 py-3 text-xl",
  sm: "px-3 py-1.5 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  children,
  ...props
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`${BASE} ${VARIANT[variant]} ${SIZE[size]} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
