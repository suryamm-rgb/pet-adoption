import { defineConfig, devices } from "@playwright/test";

const API_PORT = 5101;
const WEB_PORT = 3101;
export const API = `http://localhost:${API_PORT}/api`;
const WEB = `http://localhost:${WEB_PORT}`;

/**
 * End-to-end tests run against their own API (port 5101, database pet-platform-e2e, mock payments)
 * and their own Next.js server (port 3101), so they never touch your development data.
 * In CI set E2E_CHANNEL=chromium after `playwright install chromium`. Locally installed Chrome is used otherwise.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: { baseURL: WEB, trace: "retain-on-failure", screenshot: "only-on-failure", locale: "en-IN" },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"], channel: process.env.E2E_CHANNEL === "chromium" ? undefined : "chrome" } }],
  webServer: [
    {
      command: "node scripts/reset-e2e-db.js && node server.js",
      cwd: "../server",
      url: `${API}/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { NODE_ENV: "test", PORT: String(API_PORT), MONGO_URI: "mongodb://127.0.0.1:27017/pet-platform-e2e", CLIENT_URL: WEB, JWT_SECRET: "e2e-secret-not-for-production-use-0000" },
    },
    {
      command: `pnpm exec next dev -p ${WEB_PORT}`,
      url: WEB,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { NEXT_PUBLIC_API_URL: API, NEXT_PUBLIC_SITE_URL: WEB, NEXT_DIST_DIR: ".next-e2e" },
    },
  ],
});
