import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function defaultCacheRoot() {
  return process.env.LOCALAPPDATA
    ? join(process.env.LOCALAPPDATA, "ms-playwright")
    : join(homedir(), "AppData", "Local", "ms-playwright");
}

export function resolvePlaywrightExecutable({
  explicitPath = process.env.PW_CHROMIUM_EXECUTABLE,
  preferredPath,
  cacheRoot = defaultCacheRoot(),
  platform = process.platform,
  ci = Boolean(process.env.CI),
} = {}) {
  if (ci) return undefined;

  if (explicitPath) {
    if (!existsSync(explicitPath)) {
      throw new Error(`PW_CHROMIUM_EXECUTABLE points to a missing file: ${explicitPath}`);
    }
    return explicitPath;
  }

  if (preferredPath && existsSync(preferredPath)) return preferredPath;
  if (platform !== "win32" || !existsSync(cacheRoot)) return undefined;

  const revisions = readdirSync(cacheRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^chromium-\d+$/.test(entry.name))
    .sort((left, right) => Number(right.name.split("-")[1]) - Number(left.name.split("-")[1]));

  for (const revision of revisions) {
    for (const relativePath of [["chrome-win64", "chrome.exe"], ["chrome-win", "chrome.exe"]]) {
      const candidate = join(cacheRoot, revision.name, ...relativePath);
      if (existsSync(candidate)) return candidate;
    }
  }

  return undefined;
}
