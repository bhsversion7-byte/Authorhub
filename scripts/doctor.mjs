import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { chromium } from "@playwright/test";
import { resolvePlaywrightExecutable } from "./lib/playwrightRuntime.mjs";

const required = [];
const optional = [];
const nodeMajor = Number(process.versions.node.split(".")[0]);
required.push({ label: `Node ${process.versions.node}`, ok: nodeMajor === 22, detail: "required: 22.x" });
required.push({ label: "package-lock.json", ok: existsSync("package-lock.json"), detail: "required for npm ci" });

const browser = resolvePlaywrightExecutable({ preferredPath: chromium.executablePath() });
required.push({
  label: "Playwright Chromium",
  ok: Boolean(browser),
  detail: browser || "run: npx playwright install chromium",
});

for (const command of ["docker", "supabase"]) {
  const probe = spawnSync(command, ["--version"], { encoding: "utf8", shell: process.platform === "win32" });
  optional.push({
    label: command,
    ok: probe.status === 0,
    detail: probe.status === 0 ? (probe.stdout || probe.stderr).trim() : "CI provisions this for migration validation",
  });
}

for (const check of required) console.log(`${check.ok ? "PASS" : "FAIL"} ${check.label} - ${check.detail}`);
for (const check of optional) console.log(`${check.ok ? "READY" : "INFO"} ${check.label} - ${check.detail}`);

if (required.some((check) => !check.ok)) process.exitCode = 1;
