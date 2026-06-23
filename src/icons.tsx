import type { ReactNode } from "react";

// Brand illustration icons (camera / gallery / install), generated as
// transparent PNGs by scripts/gen-assets.mjs. Base-path aware.
const BASE = import.meta.env.BASE_URL;
// Colocated with the BrandIcon component that consumes it; the fast-refresh
// "components-only export" nag doesn't apply to this static map.
// eslint-disable-next-line react-refresh/only-export-components
export const ICONS = {
  camera: `${BASE}ic-camera.png`,
  gallery: `${BASE}ic-gallery.png`,
  install: `${BASE}ic-install.png`,
} as const;

export function BrandIcon({
  name,
  className = "h-7 w-7",
}: {
  name: keyof typeof ICONS;
  className?: string;
}) {
  return (
    <img
      src={ICONS[name]}
      alt=""
      aria-hidden="true"
      className={`${className} inline-block shrink-0 object-contain`}
    />
  );
}

// Monochrome utility icons — inherit the button's text colour via currentColor.
function Svg({
  children,
  className = "h-6 w-6",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      className={`${className} shrink-0`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const ShareIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M12 14V4" />
    <path d="M8 8l4-4 4 4" />
    <path d="M6 12v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-7" />
  </Svg>
);

export const DownloadIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M12 4v11" />
    <path d="M8 11l4 4 4-4" />
    <path d="M5 20h14" />
  </Svg>
);

export const TrashIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M7 7l1 13h8l1-13" />
  </Svg>
);

export const RefreshIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M20 12a8 8 0 1 1-2.3-5.6" />
    <path d="M20 4v4h-4" />
  </Svg>
);
