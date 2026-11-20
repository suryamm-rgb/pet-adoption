import { expect, test } from "@playwright/test";
import { client } from "./global-setup";
import { loginUI } from "./helpers";
import { PASSWORD } from "./world";

test("verify a phone number with a code (wrong codes are refused)", async ({ page }) => {
  const email = `phone+${Date.now()}@e2e.test`;
  const api = await client();
  expect((await api.post("/api/auth/register", { data: { name: "Priya Phone", email, password: PASSWORD, phone: "9876501234", city: "Pune" } })).ok()).toBeTruthy();

  await loginUI(page, email);
  await page.goto("/account");
  await expect(page.getByText("Not verified").first()).toBeVisible();
  await page.getByRole("button", { name: /Send code to/ }).click();

  // development mode (no SMS provider) shows the code on screen
  const hint = page.getByText(/your code is/);
  await expect(hint).toBeVisible();
  const code = (await hint.textContent())!.match(/\d{6}/)![0];

  await page.getByLabel("Verification code").fill(code === "000000" ? "111111" : "000000");
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByText("That code is not right")).toBeVisible();

  await page.getByLabel("Verification code").fill(code);
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByText("Phone number verified")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Phone number" })).toBeVisible(); // the "verified" card replaces the form
});

test("Google sign-in is hidden until the site has a Google client id", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
  await expect(page.getByLabel("Continue with Google")).toHaveCount(0);
});
