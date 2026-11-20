import { expect, test } from "@playwright/test";
import { apiAs, loginUI } from "./helpers";
import { users } from "./world";

test("seller ships an order with a tracking number and the buyer sees it", async ({ page, browser }) => {
  const seller = await apiAs(users.seller.email);
  const product = await (await seller.post("/api/products", { data: { name: "Chew Rope", category: "Toys", price: 29900, stock: 10 } })).json();

  // buyer places and pays an order (mock checkout) through the API
  const buyer = await apiAs(users.visitor.email);
  const order = await (await buyer.post("/api/orders", { data: { items: [{ productId: product._id, qty: 1 }], address: "7 Lake View Road, Pune 411001" } })).json();
  const pay = await (await buyer.post(`/api/payments/shop/${order._id}`)).json();
  expect((await buyer.post("/api/payments/mock-complete", { data: { razorpayOrderId: pay.razorpayOrderId } })).ok()).toBeTruthy();

  // seller packs and ships it in the UI
  await loginUI(page, users.seller.email);
  await page.goto("/seller/orders");
  await page.getByRole("button", { name: "Mark packed" }).first().click();
  await expect(page.getByText("Order updated")).toBeVisible();
  await page.getByRole("button", { name: "Mark shipped" }).first().click();
  await page.getByLabel("Courier").fill("Delhivery");
  await page.getByLabel("Tracking number").fill("DL555000111");
  await page.getByRole("button", { name: "Mark as shipped" }).click();
  await expect(page.getByText("Shipped").first()).toBeVisible();

  // buyer sees the tracker, courier and number
  const ctx = await browser.newContext();
  const b = await ctx.newPage();
  await loginUI(b, users.visitor.email);
  await b.goto("/owner/orders");
  const tracker = b.getByRole("list", { name: "Order progress" }).first();
  await expect(tracker.getByText("Shipped")).toBeVisible();
  await expect(b.getByText("DL555000111")).toBeVisible();
  await expect(b.getByText("Delhivery")).toBeVisible();
  await ctx.close();
});
