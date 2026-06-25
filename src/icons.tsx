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

export const SlidersIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M4 6h9" />
    <path d="M17 6h3" />
    <circle cx="15" cy="6" r="2" />
    <path d="M4 12h3" />
    <path d="M11 12h9" />
    <circle cx="9" cy="12" r="2" />
    <path d="M4 18h11" />
    <path d="M19 18h1" />
    <circle cx="17" cy="18" r="2" />
  </Svg>
);

export const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M19 12H5" />
    <path d="m11 6-6 6 6 6" />
  </Svg>
);

export const ArrowRightIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </Svg>
);

export const StarIcon = ({
  className,
  filled = false,
}: {
  className?: string;
  filled?: boolean;
}) => (
  <Svg className={className}>
    <path
      fill={filled ? "currentColor" : "none"}
      d="m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.5 6.3-.9z"
    />
  </Svg>
);

export const GearIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
  </Svg>
);
