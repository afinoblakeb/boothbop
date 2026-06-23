import { describe, expect, it } from "vitest";
import { STRIP, stripGeometry, THEMES, type Layout } from "./strip";

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
