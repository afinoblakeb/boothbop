import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StartupErrorBoundary } from "./StartupErrorBoundary";

const roots: ReturnType<typeof createRoot>[] = [];

afterEach(async () => {
  await act(async () => {
    for (const root of roots) root.unmount();
  });
  roots.length = 0;
  vi.restoreAllMocks();
});

describe("StartupErrorBoundary", () => {
  it("renders children during a normal startup", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    roots.push(root);

    await act(async () => {
      root.render(
        <StartupErrorBoundary>
          <p>Booth ready</p>
        </StartupErrorBoundary>,
      );
    });

    expect(container.textContent).toContain("Booth ready");
  });

  it("shows a reload recovery action when app rendering fails", async () => {
    const reload = vi.fn();
    const hideSplash = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);
    roots.push(root);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    function BrokenApp(): never {
      throw new Error("render failed");
    }

    await act(async () => {
      root.render(
        <StartupErrorBoundary reload={reload} hideSplash={hideSplash}>
          <BrokenApp />
        </StartupErrorBoundary>,
      );
    });

    const recovery = container.querySelector("[role='alert']");
    const reloadButton = container.querySelector("button");
    expect(recovery?.textContent).toContain("BoothBop couldn't start");
    expect(reloadButton?.textContent).toBe("Try again");
    expect(hideSplash).toHaveBeenCalledOnce();

    reloadButton?.click();
    expect(reload).toHaveBeenCalledOnce();
  });
});
