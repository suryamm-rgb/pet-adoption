import { expect, test } from "@playwright/test";
import { PNG } from "./global-setup";
import { apiAs, isoDay, loginUI, startStaysNow } from "./helpers";
import { users } from "./world";

test.use({ permissions: ["geolocation"], geolocation: { latitude: 18.5204, longitude: 73.8567 } });

test("during a stay the caretaker shares a location and the owner sees it on the map", async ({ page, browser }) => {
  // set up a booking that is in care right now, through the API
  const owner = await apiAs(users.owner.email);
  const pet = await (await owner.post("/api/pets", { data: { name: "Milo", type: "Dog" } })).json();
  await owner.post(`/api/pets/${pet._id}/vaccination`, { multipart: { files: { name: "v.png", mimeType: "image/png", buffer: PNG } } });
  const caretaker = await apiAs(users.caretaker.email);
  const careId = (await (await caretaker.get("/api/auth/me")).json()).user.id;
  const booking = await (await owner.post("/api/bookings", { data: { caretakerId: careId, petId: pet._id, startDate: isoDay(0), endDate: isoDay(1) } })).json();
  expect((await caretaker.patch(`/api/bookings/${booking._id}/accept`)).ok()).toBeTruthy();
  const pay = await (await owner.post("/api/payments/order", { data: { bookingId: booking._id } })).json();
  expect((await owner.post("/api/payments/mock-complete", { data: { razorpayOrderId: pay.razorpayOrderId } })).ok()).toBeTruthy();
  startStaysNow();

  // the caretaker shares a walk location in the UI
  await loginUI(page, users.caretaker.email);
  await page.goto(`/caretaker/stays/${booking._id}`);
  await page.getByLabel("Note for the owner").fill("Morning walk at the riverside park");
  await page.getByRole("button", { name: "Share location" }).click();
  await expect(page.getByText("Location shared with the owner")).toBeVisible();

  // the owner sees the map and the note
  const ctx = await browser.newContext();
  const o = await ctx.newPage();
  await loginUI(o, users.owner.email);
  await o.goto(`/owner/bookings/${booking._id}`);
  await expect(o.getByRole("heading", { name: "Locations" })).toBeVisible();
  await expect(o.getByText("Morning walk at the riverside park")).toBeVisible();
  await expect(o.locator('iframe[src*="openstreetmap.org"]')).toBeVisible();
  await ctx.close();
});
