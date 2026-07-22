import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";
export type ButtonSize = "lg" | "md" | "sm";

const BASE =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border font-sans font-semibold tracking-normal shadow-control outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-canvas active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "border-accent bg-accent text-on-accent active:bg-accent-strong",
  secondary: "border-border bg-surface text-text active:bg-surface-muted",
  quiet:
    "border-transparent bg-transparent text-text shadow-none active:bg-surface-muted",
  danger: "border-border bg-surface text-critical active:bg-surface-muted",
};

const SIZE: Record<ButtonSize, string> = {
  lg: "px-6 py-3.5 text-lg",
  md: "px-5 py-3 text-base",
  sm: "px-3 py-2 text-sm",
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
