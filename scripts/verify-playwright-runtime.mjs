import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const runtime = await import("./lib/playwrightRuntime.mjs").catch(() => ({}));

assert.equal(typeof runtime.resolvePlaywrightExecutable, "function", "Playwright runtime resolver must exist");

const cacheRoot = await mkdtemp(join(tmpdir(), "authorhub-playwright-"));

try {
  const older = join(cacheRoot, "chromium-100", "chrome-win", "chrome.exe");
  const newer = join(cacheRoot, "chromium-200", "chrome-win64", "chrome.exe");
  await mkdir(join(cacheRoot, "chromium-999", "chrome-win"), { recursive: true });
  await mkdir(join(cacheRoot, "chromium-100", "chrome-win"), { recursive: true });
  await mkdir(join(cacheRoot, "chromium-200", "chrome-win64"), { recursive: true });
  await writeFile(older, "older");
  await writeFile(newer, "newer");

  assert.equal(runtime.resolvePlaywrightExecutable({ cacheRoot, platform: "win32", ci: false }), newer);
  assert.equal(runtime.resolvePlaywrightExecutable({ cacheRoot, platform: "win32", ci: true }), undefined);
  assert.equal(runtime.resolvePlaywrightExecutable({ explicitPath: older, cacheRoot, platform: "win32", ci: false }), older);
  assert.throws(
    () => runtime.resolvePlaywrightExecutable({ explicitPath: join(cacheRoot, "missing.exe"), cacheRoot, platform: "win32", ci: false }),
    /PW_CHROMIUM_EXECUTABLE/,
  );
  assert.equal(runtime.resolvePlaywrightExecutable({ cacheRoot, platform: "linux", ci: false }), undefined);
} finally {
  await rm(cacheRoot, { recursive: true, force: true });
}

console.log("Playwright runtime checks passed.");
