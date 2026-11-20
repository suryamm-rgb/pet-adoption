import { expect, test } from "@playwright/test";
import { PNG } from "./global-setup";
import { apiAs, isoDay, loginUI } from "./helpers";
import { users } from "./world";

test("owner adds a pet, books a caretaker, the caretaker accepts and the owner pays", async ({ page }) => {
  await loginUI(page, users.owner.email);

  // 1. add a pet with its vaccination certificate
  await page.goto("/owner/pets/new");
  await page.getByLabel("Name", { exact: true }).fill("Bruno");
  await page.getByLabel("Breed").fill("Beagle");
  await page.getByLabel("Vaccination certificate").setInputFiles({ name: "vaccine.png", mimeType: "image/png", buffer: PNG });
  await page.getByRole("button", { name: "Save pet" }).click();
  await expect(page).toHaveURL(/\/owner\/pets\/[a-f0-9]{24}$/); // lands on the new pet
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Bruno");

  // 2. find the caretaker and send a request
  await page.goto("/caretakers?city=Pune");
  await page.getByRole("link", { name: /Carla Caretaker/ }).first().click();
  await expect(page).toHaveURL(/\/caretakers\/[a-f0-9]{24}/);
  await page.getByLabel("Start").fill(isoDay(3));
  await page.getByLabel("End").fill(isoDay(5));
  await expect(page.getByText("You pay", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page).toHaveURL(/\/owner\/bookings\/[a-f0-9]{24}/);
  const bookingId = page.url().split("/").pop()!;
  await expect(page.getByText("Requested").first()).toBeVisible();

  // 3. the caretaker accepts (done through the API: the caretaker UI is not what is under test here)
  const caretaker = await apiAs(users.caretaker.email);
  const accepted = await caretaker.patch(`/api/bookings/${bookingId}/accept`);
  expect(accepted.ok()).toBeTruthy();

  // 4. the owner pays through the (mock) checkout
  await page.reload();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /^Pay / }).click();
  await expect(page.getByText("Payment received")).toBeVisible();
  const activity = page.getByRole("heading", { name: "Activity" }).locator("..");
  await expect(activity.getByText("Booking requested")).toBeVisible();
  await expect(activity.getByText("Caretaker accepted")).toBeVisible();
  await expect.poll(async () => (await (await caretaker.get(`/api/bookings/${bookingId}`)).json()).status).toBe("PAID");
});

test("a booking with blocked dates is refused", async ({ page }) => {
  const caretaker = await apiAs(users.caretaker.email);
  const blocked = [isoDay(20), isoDay(21)];
  const r = await caretaker.put("/api/caretakers/me/profile", { data: { blockedDates: blocked } });
  expect(r.ok()).toBeTruthy();

  await loginUI(page, users.owner.email);
  await page.goto("/caretakers?city=Pune");
  await page.locator("#from").fill(isoDay(20));
  await page.locator("#to").fill(isoDay(22));
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByText(/no caretakers|0 verified/i).first()).toBeVisible();

  await caretaker.put("/api/caretakers/me/profile", { data: { blockedDates: [] } });
});
