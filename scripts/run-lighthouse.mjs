#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

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

process.exit(result.status ?? 1);
