import { afterEach, describe, expect, it, vi } from "vitest";
import {
  composeStrip,
  STRIP,
  stripGeometry,
  THEMES,
  type Layout,
} from "./strip";

describe("stripGeometry", () => {
  it("lays a 4x1 strip out as one tall column", () => {
    const g = stripGeometry("4x1");
    expect(g.cols).toBe(1);
    expect(g.rows).toBe(4);
    // gap + 1*(cell+gap)
    expect(g.width).toBe(STRIP.gap + STRIP.cell + STRIP.gap);
    // gap + 4*(cell+gap) + footer
    expect(g.height).toBe(
      STRIP.gap + 4 * (STRIP.cell + STRIP.gap) + STRIP.footer,
    );
  });

  it("lays a 2x2 grid out as two columns and two rows", () => {
    const g = stripGeometry("2x2");
    expect(g.cols).toBe(2);
    expect(g.rows).toBe(2);
    expect(g.width).toBe(STRIP.gap + 2 * (STRIP.cell + STRIP.gap));
    expect(g.height).toBe(
      STRIP.gap + 2 * (STRIP.cell + STRIP.gap) + STRIP.footer,
    );
  });

  it("always positions exactly four non-overlapping cells", () => {
    for (const layout of ["4x1", "2x2"] as Layout[]) {
      const { cells } = stripGeometry(layout);
      expect(cells).toHaveLength(4);
      const seen = new Set(cells.map((c) => `${c.x},${c.y}`));
      expect(seen.size).toBe(4); // no two photos share a slot
    }
  });

  it("keeps every cell inside the canvas bounds", () => {
    for (const layout of ["4x1", "2x2"] as Layout[]) {
      const g = stripGeometry(layout);
      for (const { x, y } of g.cells) {
        expect(x + STRIP.cell).toBeLessThanOrEqual(g.width);
        expect(y + STRIP.cell).toBeLessThanOrEqual(g.height - STRIP.footer);
      }
    }
  });
});

// composeStrip needs a real 2D context, which jsdom lacks — so we stub
// getContext with a spy and assert on the draw calls instead of pixels.
function fakeCtx() {
  return {
    fillStyle: "",
    font: "",
    textAlign: "",
    textBaseline: "",
    globalAlpha: 1,
    letterSpacing: "",
    shadowColor: "",
    shadowBlur: 0,
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    fillText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
  };
}

const fourFrames = () =>
  Array.from(
    { length: 4 },
    () => ({ width: 100, height: 100 }) as unknown as HTMLCanvasElement,
  );

const drewCaption = (ctx: ReturnType<typeof fakeCtx>) =>
  ctx.fillText.mock.calls.some((c) =>
    String(c[0]).toUpperCase().includes("BOOTHBOP"),
  );

describe("composeStrip branding", () => {
  afterEach(() => vi.restoreAllMocks());

  it("draws the brand logo image in the footer when a logo is provided", () => {
    const ctx = fakeCtx();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    const logo = { width: 200, height: 80 } as unknown as HTMLImageElement;

    composeStrip(fourFrames(), "4x1", THEMES.classic, logo);

    const drewLogo = ctx.drawImage.mock.calls.some((c) => c[0] === logo);
    expect(drewLogo).toBe(true);
    // With the logo present it must NOT fall back to the text wordmark.
    expect(drewCaption(ctx)).toBe(false);
  });

  it("falls back to the text caption when no logo is available", () => {
    const ctx = fakeCtx();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );

    composeStrip(fourFrames(), "4x1", THEMES.classic, null);

    expect(drewCaption(ctx)).toBe(true);
  });
});

describe("THEMES", () => {
  it("exposes the documented swatches with valid hex colours", () => {
    const keys = Object.keys(THEMES);
    expect(keys).toContain("classic");
    for (const theme of Object.values(THEMES)) {
      expect(theme.background).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.text).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.caption.length).toBeGreaterThan(0);
    }
  });
});
