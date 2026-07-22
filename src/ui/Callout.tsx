import type { ElementType, ReactNode } from "react";

export type CalloutTone =
  | "error"
  | "info"
  | "neutral"
  | "highlight"
  | "warning";

const TONE: Record<CalloutTone, string> = {
  error: "border-critical/30 bg-critical/5",
  info: "border-positive/25 bg-positive/5",
  neutral: "border-border bg-surface",
  highlight: "border-accent/25 bg-accent-soft",
  warning: "border-mustard/40 bg-mustard/10",
};

export function Callout({
  as: As = "div",
  tone = "neutral",
  className = "",
  children,
}: {
  as?: ElementType;
  tone?: CalloutTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <As className={`rounded-lg border ${TONE[tone]} ${className}`}>
      {children}
    </As>
  );
}
