import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const html = readFileSync("dist/index.html", "utf8");
const document = new JSDOM(html).window.document;
const mainSource = readFileSync("main.ts", "utf8");

describe("TURNLINE interface contract", () => {
  it("opens directly on the playable surface without tutorial copy", () => {
    expect(document.querySelector("#track-canvas")).toBeTruthy();
    expect(document.querySelector("#junction-layer")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(
      /how to play|tutorial|instructions|click here|tap here|press to start/i,
    );
  });

  it("keeps controls on native buttons with a live result state", () => {
    expect(document.querySelectorAll("button").length).toBeGreaterThanOrEqual(3);
    expect(document.querySelector("#result-overlay[hidden]")).toBeTruthy();
    expect(document.querySelector('[role="status"][aria-live="polite"]')).toBeTruthy();
    expect(mainSource).toContain('document.createElement("button")');
  });

  it("uses one continuous canvas mechanic with generated sound", () => {
    expect(document.querySelectorAll("canvas")).toHaveLength(1);
    expect(document.querySelector("audio, video")).toBeNull();
    expect(mainSource).toContain("requestAnimationFrame");
    expect(mainSource).toContain("new AudioContext");
    expect(mainSource).toContain("toggleJunction");
  });
});
