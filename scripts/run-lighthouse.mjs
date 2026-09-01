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
  const reports = manifest
    .filter((entry) => entry?.jsonPath && existsSync(entry.jsonPath))
    .map((entry) => JSON.parse(readFileSync(entry.jsonPath, "utf8")));
  if (reports.length > 0) {
    const median = (values) => {
      const ordered = [...values].sort((left, right) => left - right);
      return ordered[Math.floor(ordered.length / 2)];
    };
    const score = (category) =>
      Math.round(median(reports.map((report) => report.categories[category]?.score ?? 0)) * 100);
    const metric = (audit) =>
      median(reports.map((report) => report.audits[audit]?.numericValue ?? 0));
    console.log(
      [
        `Lighthouse median (${reports.length} runs): performance ${score("performance")}`,
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
