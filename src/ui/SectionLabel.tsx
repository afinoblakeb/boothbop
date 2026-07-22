import type { ReactNode } from "react";

export function SectionLabel({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      className={`font-sans text-xs font-semibold tracking-normal text-text-muted ${className}`}
    >
      {children}
    </p>
  );
}
