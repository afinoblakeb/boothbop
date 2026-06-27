export type ProContext =
  | "settings"
  | "template"
  | "layout"
  | "look"
  | "props"
  | "caption"
  | "quality"
  | "print"
  | "party";

export interface ProOfferCopy {
  eyebrow: string;
  title: string;
  body: string;
  bullets: readonly string[];
  cta: string;
}

const DEFAULT_PRICE = "$1.99/month";

const CONTEXT_TITLES: Record<ProContext, string> = {
  settings: "BoothBop Pro",
  template: "Unlock Pro Templates",
  layout: "Unlock Pro Layouts",
  look: "Unlock Pro Looks",
  props: "Unlock Pro Props",
  caption: "Unlock Custom Captions",
  quality: "Unlock HD Exports",
  print: "Unlock Print Sheets",
  party: "Unlock Guest Extras",
};

const CONTEXT_EYEBROWS: Record<ProContext, string> = {
  settings: "BoothBop Pro",
  template: "Premium template",
  layout: "Premium layout",
  look: "Premium look",
  props: "Premium prop pack",
  caption: "Premium personalization",
  quality: "Premium export",
  print: "Premium print export",
  party: "Guest mode",
};

export function proPriceLabel(price: string | null): string {
  if (!price) return DEFAULT_PRICE;
  if (/\/|per|month|mo/i.test(price)) return price;
  return `${price}/month`;
}

export function proOfferCopy(
  context: ProContext,
  price: string | null,
): ProOfferCopy {
  const label = proPriceLabel(price);
  return {
    eyebrow: CONTEXT_EYEBROWS[context],
    title: CONTEXT_TITLES[context],
    body: "BoothBop Pro is optional. The free booth still makes strips, GIFs, boomerangs, and videos; Pro adds premium template drops, custom captions, print sheets, HD exports, and watermark-free saved outputs. Your photos stay on this device.",
    bullets: [
      "Premium template packs and creative drops",
      "Custom captions, HD exports, and 4x6 print sheets",
      "Remove BoothBop branding from newly saved strips, GIFs, and videos",
    ],
    cta: `Start Pro - ${label}`,
  };
}
