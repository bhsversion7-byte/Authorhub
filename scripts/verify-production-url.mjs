const targetUrl = process.argv[2] ?? "https://authorhub.cn";
const expectedAsset = process.argv[3] ?? "";
const RETRIES = 10;
const RETRY_DELAY_MS = 6000;

function fail(message) {
  throw new Error(`${targetUrl}: ${message}`);
}

let lastFailure = "request failed";
for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
  try {
    const asset = await verifyDeployment();
    console.log(`Production URL check passed for ${targetUrl} (${asset}).`);
    process.exit(0);
  } catch (error) {
    lastFailure = error instanceof Error ? error.message : String(error);
  }
  if (attempt < RETRIES) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
}
fail(`${lastFailure} after ${RETRIES} attempts`);

async function verifyDeployment() {
  const response = await fetch(targetUrl, { headers: { "Cache-Control": "no-cache" } });
  if (!response.ok) throw new Error(`returned HTTP ${response.status}`);

  const html = await response.text();
  const assetMatch = html.match(/assets\/index-[^"']+\.js/);
  if (!assetMatch) throw new Error("did not reference an AuthorHub index asset");
  if (expectedAsset && assetMatch[0] !== expectedAsset) {
    throw new Error(`still references ${assetMatch[0]}, expected ${expectedAsset}`);
  }

  const assetUrl = new URL(assetMatch[0], targetUrl);
  const assetResponse = await fetch(assetUrl, { headers: { "Cache-Control": "no-cache" } });
  if (!assetResponse.ok) throw new Error(`${assetUrl} returned HTTP ${assetResponse.status}`);

  const source = await assetResponse.text();
  if (!source.includes(".supabase.co")) throw new Error("asset does not contain a Supabase project host");
  if (/VITE_SUPABASE_URL\s*:\s*`{2}/.test(source) || /VITE_SUPABASE_URL\s*:\s*""/.test(source)) {
    throw new Error("asset contains an empty VITE_SUPABASE_URL");
  }
  if (/VITE_SUPABASE_ANON_KEY\s*:\s*`{2}/.test(source) || /VITE_SUPABASE_ANON_KEY\s*:\s*""/.test(source)) {
    throw new Error("asset contains an empty VITE_SUPABASE_ANON_KEY");
  }
  return assetMatch[0];
}
