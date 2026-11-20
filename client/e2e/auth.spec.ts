import { expect, test } from "@playwright/test";
import { PASSWORD } from "./world";

test("sign up, log out, reject a wrong password, log in, edit the profile", async ({ page }) => {
  const email = `newowner+${Date.now()}@e2e.test`;

  await page.goto("/register");
  await page.getByLabel("Full name").fill("Nina New");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Phone").fill("9876543210");
  await page.getByLabel("City").fill("Pune");
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL(/\/owner/);

  // log out through the account menu
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("link", { name: "Log in" }).first()).toBeVisible();

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Wrong email or password")).toBeVisible();

  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/owner/);

  await page.goto("/account");
  await page.getByLabel("Full name").fill("Nina Renamed");
  await page.getByLabel("City").fill("Mumbai");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Profile updated")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Full name")).toHaveValue("Nina Renamed");
});

test("anonymous visitors are sent to the login page", async ({ page }) => {
  await page.goto("/owner/bookings");
  await expect(page).toHaveURL(/\/login\?next=/);
});
