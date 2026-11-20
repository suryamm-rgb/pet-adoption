import { expect, type Page } from "@playwright/test";
import { client } from "./global-setup";
import { PASSWORD } from "./world";

export async function loginUI(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

/** An API session (cookie kept) for acting as another user without clicking through the UI. */
export async function apiAs(email: string) {
  const c = await client();
  const r = await c.post("/api/auth/login", { data: { email, password: PASSWORD } });
  if (!r.ok()) throw new Error(`login ${email}: ${await r.text()}`);
  return c;
}

export const isoDay = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

import { execFileSync } from "node:child_process";
import path from "node:path";

/** Runs the hourly "start stays" job right now against the e2e database. */
export function startStaysNow() {
  execFileSync("node", ["scripts/e2e-start-stays.js"], {
    cwd: path.resolve(__dirname, "../../server"),
    env: { ...process.env, NODE_ENV: "test", MONGO_URI: "mongodb://127.0.0.1:27017/pet-platform-e2e" },
    stdio: "pipe",
  });
}
