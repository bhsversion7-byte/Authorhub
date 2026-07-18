import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envOnly = process.argv.includes("--env-only");

function readVercelEnv() {
  const envPath = path.join(root, ".vercel", ".env.production.local");
  if (!fs.existsSync(envPath)) return null;
  const values = {};
  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = rawLine.match(/^(VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY)=(.*)$/);
    if (!match) continue;
    values[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return values;
}

function requireProductionEnv(values, { strict = false } = {}) {
  if (!values) {
    if (strict) throw new Error(".vercel/.env.production.local was not found.");
    return;
  }
  const url = values.VITE_SUPABASE_URL ?? "";
  const anonKey = values.VITE_SUPABASE_ANON_KEY ?? "";
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url)) {
    if (!strict) {
      console.warn("Skipping stale local .vercel production env check; validating built bundle instead.");
      return;
    }
    throw new Error("VITE_SUPABASE_URL is missing or is not a Supabase project URL.");
  }
  if (!isValidPublicKey(anonKey)) {
    if (!strict) {
      console.warn("Skipping stale local .vercel production env check; validating built bundle instead.");
      return;
    }
    throw new Error("VITE_SUPABASE_ANON_KEY is missing or too short.");
  }
  console.log("Production Vite Supabase env file check passed.");
}

function isValidPublicKey(value) {
  return /^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(value)
    || (value.length >= 100 && value.split(".").length === 3);
}

function verifyBuiltBundle() {
  const assetsDir = path.join(root, "dist", "assets");
  if (!fs.existsSync(assetsDir)) {
    throw new Error("dist/assets was not found. Run npm run build before verifying the production bundle.");
  }

  const appChunks = fs
    .readdirSync(assetsDir)
    .filter((file) => file.endsWith(".js"))
    .map((file) => ({ file, source: fs.readFileSync(path.join(assetsDir, file), "utf8") }))
    .filter(({ source }) => source.includes("author-hub-local-auth-user") || source.includes("author-hub-shimo-cache"));

  if (appChunks.length === 0) {
    throw new Error("Could not find the AuthorHub app chunk in dist/assets.");
  }

  const emptyEnvPatterns = [/VITE_SUPABASE_URL\s*:\s*`{2}/, /VITE_SUPABASE_URL\s*:\s*""/, /VITE_SUPABASE_ANON_KEY\s*:\s*`{2}/, /VITE_SUPABASE_ANON_KEY\s*:\s*""/];
  for (const { file, source } of appChunks) {
    if (!source.includes(".supabase.co")) {
      throw new Error(`${file} does not contain a Supabase project host. The production bundle would fall back to local-only data.`);
    }
    if (!source.includes("sb_publishable_") && !source.includes("eyJ")) {
      throw new Error(`${file} does not contain a Supabase publishable or legacy anon key.`);
    }
    if (emptyEnvPatterns.some((pattern) => pattern.test(source))) {
      throw new Error(`${file} contains an empty Vite Supabase env value.`);
    }
  }

  console.log(`Production bundle Supabase env check passed (${appChunks.map(({ file }) => file).join(", ")}).`);
}

requireProductionEnv(readVercelEnv(), { strict: envOnly });
if (!envOnly) verifyBuiltBundle();
