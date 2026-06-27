import { describe, expect, it } from "vitest";
import { proOfferCopy, proPriceLabel, type ProContext } from "./pro";

describe("pro", () => {
  it("formats StoreKit subscription prices as monthly labels", () => {
    expect(proPriceLabel(null)).toBe("$1.99/month");
    expect(proPriceLabel("$1.99")).toBe("$1.99/month");
    expect(proPriceLabel("$1.99/month")).toBe("$1.99/month");
    expect(proPriceLabel("$1.99/mo")).toBe("$1.99/mo");
  });

  it("uses trigger-specific headlines for every Pro entry point", () => {
    const contexts: ProContext[] = [
      "settings",
      "template",
      "layout",
      "look",
      "props",
      "caption",
      "quality",
      "print",
      "party",
    ];
    const titles = contexts.map((context) => proOfferCopy(context, null).title);

    expect(new Set(titles).size).toBe(contexts.length);
    expect(titles).toContain("Unlock Pro Templates");
    expect(titles).toContain("Unlock Custom Captions");
    expect(titles).toContain("Unlock Print Sheets");
    expect(titles).toContain("Unlock Guest Extras");
  });

  it("keeps the core value props visible on every paywall", () => {
    const copy = proOfferCopy("template", "$1.99");

    expect(copy.cta).toBe("Start Pro - $1.99/month");
    expect(copy.body).toMatch(/optional/i);
    expect(copy.body).toMatch(/premium template drops/i);
    expect(copy.body).toMatch(/print sheets/i);
    expect(copy.body).toMatch(/watermark-free/i);
    expect(copy.bullets.join(" ")).toMatch(/premium template packs/i);
    expect(copy.bullets.join(" ")).toMatch(/BoothBop branding/i);
    expect(copy.bullets).toHaveLength(3);
  });
});
