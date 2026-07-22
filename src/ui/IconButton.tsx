import type { ButtonHTMLAttributes, ReactNode } from "react";

export type IconButtonVariant = "ghost" | "surface" | "inverse" | "danger";

const VARIANT: Record<IconButtonVariant, string> = {
  ghost: "border-transparent bg-transparent text-text active:bg-surface-muted",
  surface:
    "border-border bg-surface text-text shadow-control active:bg-surface-muted",
  inverse:
    "border-editor-border bg-editor-surface text-text-inverse active:bg-editor-border",
  danger:
    "border-transparent bg-transparent text-critical active:bg-surface-muted",
};

export function IconButton({
  "aria-label": label,
  variant = "ghost",
  className = "",
  children,
  ...props
}: {
  "aria-label": string;
  variant?: IconButtonVariant;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      aria-label={label}
      className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:scale-95 disabled:pointer-events-none disabled:opacity-40 ${VARIANT[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
