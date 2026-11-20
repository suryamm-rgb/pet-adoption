import { expect, test } from "@playwright/test";
import { client } from "./global-setup";
import { loginUI } from "./helpers";
import { LISTING_TITLE, users } from "./world";

test("a visitor reports a listing and the admin removes it", async ({ page, browser }) => {
  const anon = await client();
  const listings = await (await anon.get("/api/listings?mode=adopt")).json();
  const listing = listings.find((l: { title: string }) => l.title === LISTING_TITLE);
  expect(listing, "the seeded listing should be public").toBeTruthy();

  // visitor reports it
  await loginUI(page, users.visitor.email);
  await page.goto(`/listings/${listing._id}`);
  await page.getByRole("button", { name: "Report this listing" }).click();
  await page.getByLabel("Reason").selectOption("fraud");
  await page.getByLabel("Details (optional)").fill("The photos look stolen.");
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(page.getByText("Thanks. Our team will review this.")).toBeVisible();

  // admin sees it and removes the content
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await loginUI(admin, users.admin.email);
  await admin.goto("/admin/reports");
  await expect(admin.getByText("The photos look stolen.")).toBeVisible();
  await admin.getByRole("button", { name: "Remove content" }).click();
  await expect(admin.getByText("Report resolved")).toBeVisible();
  await expect(admin.getByText("No open reports")).toBeVisible();
  await adminCtx.close();

  // the listing is no longer public
  const after = await (await anon.get("/api/listings?mode=adopt")).json();
  expect(after.find((l: { _id: string }) => l._id === listing._id)).toBeFalsy();
});
