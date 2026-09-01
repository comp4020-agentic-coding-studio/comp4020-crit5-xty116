import { readFileSync } from "node:fs";
import axe from "axe-core";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

describe("built accessibility sensor", () => {
  it("has no automatically detectable axe violations", async () => {
    const dom = new JSDOM(readFileSync("dist/index.html", "utf8"), {
      pretendToBeVisual: true,
      runScripts: "outside-only",
    });
    dom.window.eval(axe.source);

    const results = await (
      dom.window as typeof dom.window & {
        axe: typeof axe;
      }
    ).axe.run(dom.window.document, {
      rules: {
        // JSDOM has no layout engine; Lighthouse checks real rendered contrast.
        "color-contrast": { enabled: false },
      },
    });

    expect(
      results.violations.map(({ id, nodes }) => ({
        id,
        targets: nodes.flatMap((node) => node.target),
      })),
    ).toEqual([]);
  });
});
