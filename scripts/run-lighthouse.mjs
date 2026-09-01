#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const environment = { ...process.env };
const macChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

if (!environment.CHROME_PATH && process.platform === "darwin" && existsSync(macChrome)) {
  environment.CHROME_PATH = macChrome;
}

const result = spawnSync(process.platform === "win32" ? "lhci.cmd" : "lhci", ["autorun"], {
  env: environment,
  shell: process.platform === "win32",
  stdio: "inherit",
});

const manifestPath = ".lighthouseci/manifest.json";
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const entry = manifest.find((item) => item.isRepresentativeRun) ?? manifest[0];
  if (entry?.jsonPath && existsSync(entry.jsonPath)) {
    const report = JSON.parse(readFileSync(entry.jsonPath, "utf8"));
    const score = (category) => Math.round((report.categories[category]?.score ?? 0) * 100);
    const metric = (audit) => report.audits[audit]?.numericValue ?? 0;
    console.log(
      [
        `Lighthouse findings: performance ${score("performance")}`,
        `accessibility ${score("accessibility")}`,
        `best practices ${score("best-practices")}`,
        `LCP ${Math.round(metric("largest-contentful-paint"))}ms`,
        `CLS ${metric("cumulative-layout-shift").toFixed(3)}`,
        `TBT ${Math.round(metric("total-blocking-time"))}ms`,
      ].join(" | "),
    );
  }
}

process.exit(result.status ?? 1);
