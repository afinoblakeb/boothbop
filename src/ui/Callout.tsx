import type { ElementType, ReactNode } from "react";

// A bordered notice box — the recurring 2px-bordered tinted panel used for
// errors, the install nudge, the auto-save tip, and the "iOS app only" note.
// `tone` sets the border + fill; padding and text styling come via `className`
// so the box shape stays identical while each context keeps its own density.
// `as` lets a single-paragraph notice render as a `<p>` rather than a wrapper.
export type CalloutTone =
  | "error"
  | "info"
  | "neutral"
  | "highlight"
  | "warning";

const TONE: Record<CalloutTone, string> = {
  error: "border-orange-dark bg-orange/10",
  info: "border-teal bg-teal/10",
  neutral: "border-ink/30 bg-paper",
  highlight: "border-ink bg-orange/15",
  warning: "border-ink bg-mustard/25",
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
  return <As className={`border-2 ${TONE[tone]} ${className}`}>{children}</As>;
}
