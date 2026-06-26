export type ProContext =
  | "settings"
  | "template"
  | "layout"
  | "look"
  | "props"
  | "caption"
  | "quality";

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
};

const CONTEXT_EYEBROWS: Record<ProContext, string> = {
  settings: "BoothBop Pro",
  template: "Premium template",
  layout: "Premium layout",
  look: "Premium look",
  props: "Premium prop pack",
  caption: "Premium personalization",
  quality: "Premium export",
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
    body: "BoothBop Pro unlocks every premium template, Pro looks and props, custom captions, HD GIFs and video, and watermark-free animated exports. Your photos stay on this device.",
    bullets: [
      "Premium event templates and specialty strip layouts",
      "Glam, vintage, party, wedding, holiday, and brand-ready looks",
      "Watermark-free HD GIFs and videos with custom captions",
    ],
    cta: `Start Pro - ${label}`,
  };
}
