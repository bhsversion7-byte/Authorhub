import { chromium, defineConfig } from "@playwright/test";
import { resolvePlaywrightExecutable } from "./scripts/lib/playwrightRuntime.mjs";

const playwrightExecutable = resolvePlaywrightExecutable({ preferredPath: chromium.executablePath() });

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./output/playwright",
  fullyParallel: true,
  workers: process.env.CI ? 4 : 2,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["line"], ["html", { outputFolder: "output/playwright-report", open: "never" }]] : "line",
  use: {
    baseURL: "http://127.0.0.1:4173",
    launchOptions: {
      executablePath: playwrightExecutable,
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  webServer: {
    command: "npm run dev:any -- --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_SUPABASE_URL: "",
      VITE_SUPABASE_ANON_KEY: "",
    },
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "desktop-1080p", use: { viewport: { width: 1920, height: 1080 } } },
    { name: "tablet", use: { viewport: { width: 768, height: 1024 }, hasTouch: true } },
    { name: "phone", use: { viewport: { width: 390, height: 844 }, hasTouch: true } },
    { name: "phone-small", use: { viewport: { width: 320, height: 568 }, hasTouch: true } },
  ],
});
