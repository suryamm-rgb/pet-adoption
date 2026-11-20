process.env.NODE_ENV = "test";
process.env.MONGO_URI = "mongodb://127.0.0.1:27017/pet-platform-test-v3";

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const { createApp } = await import("../app.js");
const { connectDb } = await import("../config/db.js");
const models = await import("../models/index.js");
const { signPayment } = await import("../services/razorpayService.js");
const { PRIVATE_DIR } = await import("../middleware/upload.js");

let server;
let base;

function client() {
  let cookie = "";
  const call = async (method, path, body) => {
    const res = await fetch(base + path, { method, headers: { ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    const text = await res.text();
    try { return { status: res.status, data: JSON.parse(text) }; } catch { return { status: res.status, data: text }; }
  };
  call.cookie = () => cookie;
  return call;
}
const asAdmin = async () => {
  const c = client();
  await models.User.create({ name: "Admin", email: "admin@t.test", roles: ["admin"], passwordHash: await bcrypt.hash("Password123", 4), emailVerified: true });
  await c("POST", "/auth/login", { email: "admin@t.test", password: "Password123" });
  return c;
};

before(async () => {
  await connectDb();
  await mongoose.connection.dropDatabase();
  server = http.createServer(createApp()).listen(0);
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  server.close();
});

describe("account", () => {
  const a = client();
  const a2 = client(); // the same user on a second device

  test("edit profile, change password signs out other devices", async () => {
    await client()("POST", "/auth/register", { name: "Founder", email: "founder@t.test", password: "Password123" });
    await a("POST", "/auth/register", { name: "Sam Owner", email: "sam@t.test", password: "Password123" });
    await a2("POST", "/auth/login", { email: "sam@t.test", password: "Password123" });

    const edit = await a("PATCH", "/auth/me", { name: "Sam Q", phone: "9876543210", city: "Pune" });
    assert.equal(edit.data.user.city, "Pune");

    assert.equal((await a("POST", "/auth/change-password", { currentPassword: "wrong-pass", newPassword: "NewPassword1" })).status, 401);
    assert.equal((await a("POST", "/auth/change-password", { currentPassword: "Password123", newPassword: "NewPassword1" })).status, 200);
    assert.equal((await a("GET", "/auth/me")).status, 200); // this device got a fresh cookie
    assert.equal((await a2("GET", "/auth/me")).status, 401); // the other one is signed out
    assert.equal((await client()("POST", "/auth/login", { email: "sam@t.test", password: "NewPassword1" })).status, 200);
  });

  test("logout everywhere", async () => {
    const x = client();
    await x("POST", "/auth/login", { email: "sam@t.test", password: "NewPassword1" });
    await a("POST", "/auth/logout-all");
    assert.equal((await x("GET", "/auth/me")).status, 401);
  });

  test("delete account needs the password, anonymises, and frees the email", async () => {
    const b = client();
    await b("POST", "/auth/register", { name: "Temp", email: "temp@t.test", password: "Password123" });
    assert.equal((await b("DELETE", "/auth/me", { password: "nope" })).status, 401);
    assert.equal((await b("DELETE", "/auth/me", { password: "Password123" })).status, 200);
    assert.equal((await b("GET", "/auth/me")).status, 401);
    const u = await models.User.findOne({ name: "Deleted user" });
    assert.ok(u.deletedAt);
    assert.equal((await client()("POST", "/auth/login", { email: "temp@t.test", password: "Password123" })).status, 401);
    assert.equal((await client()("POST", "/auth/register", { name: "Temp2", email: "temp@t.test", password: "Password123" })).status, 201);
  });
});

describe("private documents", () => {
  test("only the owner, a booked caretaker or an admin can open a vaccination file", async () => {
    const owner = client();
    const stranger = client();
    const admin = await asAdmin();
    await owner("POST", "/auth/register", { name: "Pat", email: "pat@t.test", password: "Password123" });
    await stranger("POST", "/auth/register", { name: "Nosy", email: "nosy@t.test", password: "Password123" });
    const pet = (await owner("POST", "/pets", { name: "Rex", type: "Dog" })).data;
    fs.writeFileSync(path.join(PRIVATE_DIR, "test-doc.pdf"), "%PDF-1.4 test");
    await models.Pet.updateOne({ _id: pet._id }, { vaccinationDocs: ["/api/files/private/test-doc.pdf"] });
    try {
      assert.equal((await owner("GET", "/files/private/test-doc.pdf")).status, 200);
      assert.equal((await admin("GET", "/files/private/test-doc.pdf")).status, 200);
      assert.equal((await stranger("GET", "/files/private/test-doc.pdf")).status, 403);
      assert.equal((await client()("GET", "/files/private/test-doc.pdf")).status, 401);
      assert.equal((await owner("GET", "/files/private/..%2F..%2Fpackage.json")).status, 403);
      // never reachable through the public static route
      const pub = await fetch(base.replace("/api", "") + "/uploads/test-doc.pdf");
      assert.equal(pub.status, 404);
    } finally {
      fs.rmSync(path.join(PRIVATE_DIR, "test-doc.pdf"), { force: true });
    }
  });
});

describe("moderation and review replies", () => {
  test("reply once, report, admin hides the review and the rating updates", async () => {
    const owner = client();
    const caretaker = client();
    const admin = await models.User.findOne({ email: "admin@t.test" }) && client();
    await admin("POST", "/auth/login", { email: "admin@t.test", password: "Password123" });
    const o = (await owner("POST", "/auth/register", { name: "Rita", email: "rita@t.test", password: "Password123" })).data.user;
    const c = (await caretaker("POST", "/auth/register", { name: "Carl", email: "carl@t.test", password: "Password123", role: "caretaker" })).data.user;
    await models.CaretakerProfile.updateOne({ userId: c.id }, { verificationStatus: "approved", pricePerDay: 50000 });
    const booking = await models.Booking.create({ ownerId: o.id, caretakerId: c.id, petId: new mongoose.Types.ObjectId(), startDate: new Date(), endDate: new Date(), status: "COMPLETED", days: 1 });
    const review = await models.Review.create({ bookingId: booking._id, fromUserId: o.id, toUserId: c.id, rating: 1, comment: "Rude review with spam link" });
    await models.CaretakerProfile.updateOne({ userId: c.id }, { ratingAvg: 1, ratingCount: 1 });

    assert.equal((await owner("POST", `/reviews/${review._id}/reply`, { text: "thanks" })).status, 403); // not the reviewee
    assert.equal((await caretaker("POST", `/reviews/${review._id}/reply`, { text: "Sorry you felt that way." })).status, 200);
    assert.equal((await caretaker("POST", `/reviews/${review._id}/reply`, { text: "again" })).status, 409);

    const rep = await caretaker("POST", "/reports", { targetType: "review", targetId: String(review._id), reason: "spam", details: "link" });
    assert.equal(rep.status, 201);
    assert.equal((await caretaker("POST", "/reports", { targetType: "review", targetId: String(review._id), reason: "spam" })).status, 409);
    assert.equal((await caretaker("GET", "/admin/reports")).status, 403);

    const list = await admin("GET", "/admin/reports");
    assert.equal(list.data.length, 1);
    assert.equal((await admin("PATCH", `/admin/reports/${rep.data._id}`, { action: "remove" })).data.status, "actioned");
    assert.equal((await models.Review.findById(review._id)).hidden, true);
    const profile = await models.CaretakerProfile.findOne({ userId: c.id });
    assert.equal(profile.ratingCount, 0);
    assert.equal((await client()("GET", `/caretakers/${c.id}/reviews`)).data.length, 0);
    assert.ok(await models.AuditLog.findOne({ action: "report.remove" }));
  });
});

describe("shop cancellation and seller isolation", () => {
  test("buyer cancels a paid order: refund, restock; other sellers cannot touch it", async () => {
    const seller = client();
    const other = client();
    const buyer = client();
    await seller("POST", "/auth/register", { name: "Shop", email: "shop@t.test", password: "Password123" });
    await other("POST", "/auth/register", { name: "Other", email: "other@t.test", password: "Password123" });
    await buyer("POST", "/auth/register", { name: "Buyer", email: "buyer@t.test", password: "Password123" });
    await seller("POST", "/auth/roles", { role: "seller" });
    await other("POST", "/auth/roles", { role: "seller" });
    const product = (await seller("POST", "/products", { name: "Leash", price: 50000, stock: 5 })).data;

    const order = (await buyer("POST", "/orders", { items: [{ productId: product._id, qty: 2 }], address: "12 Park Road, Pune 411001" })).data;
    const pay = (await buyer("POST", `/payments/shop/${order._id}`)).data;
    await buyer("POST", "/payments/verify", { razorpay_order_id: pay.razorpayOrderId, razorpay_payment_id: "pay_x", razorpay_signature: signPayment(pay.razorpayOrderId, "pay_x") });
    assert.equal((await models.Product.findById(product._id)).stock, 3);

    assert.equal((await other("PATCH", `/orders/${order._id}/status`, { status: "PACKED" })).status, 403);
    assert.equal((await other("PATCH", `/orders/${order._id}/cancel`, {})).status, 403);
    assert.ok((await seller("GET", "/orders/seller")).data.length >= 1);

    // a second order to walk through tracking
    const o2 = (await buyer("POST", "/orders", { items: [{ productId: product._id, qty: 1 }], address: "12 Park Road, Pune 411001" })).data;
    const pay2 = (await buyer("POST", `/payments/shop/${o2._id}`)).data;
    await buyer("POST", "/payments/verify", { razorpay_order_id: pay2.razorpayOrderId, razorpay_payment_id: "pay_y", razorpay_signature: signPayment(pay2.razorpayOrderId, "pay_y") });
    assert.equal((await seller("PATCH", `/orders/${o2._id}/status`, { status: "PACKED" })).status, 200);
    assert.equal((await seller("PATCH", `/orders/${o2._id}/status`, { status: "SHIPPED" })).status, 400); // needs courier + tracking number
    const shipped = await seller("PATCH", `/orders/${o2._id}/status`, { status: "SHIPPED", courier: "Delhivery", trackingNumber: "DL123456789" });
    assert.equal(shipped.data.shipment.trackingNumber, "DL123456789");
    assert.deepEqual(shipped.data.statusHistory.map((h) => h.status), ["PENDING_PAYMENT", "PLACED", "PACKED", "SHIPPED"]);
    const mine = (await buyer("GET", "/orders/mine")).data.find((o) => o._id === o2._id);
    assert.equal(mine.shipment.courier, "Delhivery");
    assert.ok(await models.Notification.findOne({ type: "order_shipped" }));

    const cancelled = await buyer("PATCH", `/orders/${order._id}/cancel`, { reason: "Changed my mind" });
    assert.equal(cancelled.data.status, "CANCELLED");
    assert.equal(cancelled.data.refundAmount, 100000);
    assert.equal((await models.Product.findById(product._id)).stock, 4); // 5 - 1 (second order still open) + 0, first order restocked
    assert.equal((await models.Payment.findOne({ orderId: order._id })).status, "refunded");
    assert.equal((await buyer("PATCH", `/orders/${order._id}/cancel`, {})).status, 409);
  });
});

describe("availability and bank details", () => {
  test("blocked dates hide the caretaker from search and block bookings; bank details validate", async () => {
    const caretaker = client();
    const u = (await caretaker("POST", "/auth/register", { name: "Dina", email: "dina@t.test", password: "Password123", role: "caretaker" })).data.user;
    await models.CaretakerProfile.updateOne({ userId: u.id }, { verificationStatus: "approved", pricePerDay: 40000, city: "Pune" });
    const day = (n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

    assert.equal((await caretaker("PUT", "/caretakers/me/profile", { bankDetails: { accountName: "Dina", accountNumber: "12", ifsc: "bad" } })).status, 400);
    const ok = await caretaker("PUT", "/caretakers/me/profile", { blockedDates: [day(10), day(11)], bankDetails: { accountName: "Dina D", accountNumber: "123456789012", ifsc: "hdfc0001234" } });
    assert.equal(ok.status, 200);
    assert.equal(ok.data.bankDetails.ifsc, "HDFC0001234");

    const q = (from, to) => client()("GET", `/caretakers?city=Pune&from=${from}&to=${to}`);
    assert.equal((await q(day(10), day(12))).data.length, 0);
    assert.equal((await q(day(20), day(22))).data.length, 1);
    // the public profile never exposes bank details or blocked dates
    const pub = (await client()("GET", `/caretakers/${u.id}`)).data;
    assert.equal(pub.bankDetails, undefined);
    assert.equal(pub.blockedDates, undefined);
  });
});

describe("admin pagination", () => {
  test("users list pages", async () => {
    const admin = client();
    await admin("POST", "/auth/login", { email: "admin@t.test", password: "Password123" });
    const p1 = await admin("GET", "/admin/users?limit=2&page=1");
    const p2 = await admin("GET", "/admin/users?limit=2&page=2");
    assert.equal(p1.data.length, 2);
    assert.notEqual(p1.data[0]._id, p2.data[0]._id);
  });
});

describe("client error reports", () => {
  test("accepts browser crashes anonymously, rejects junk", async () => {
    const c = client();
    assert.equal((await c("POST", "/client-errors", { message: "Cannot read x", stack: "at foo", url: "/owner", source: "boundary" })).status, 204);
    assert.equal((await c("POST", "/client-errors", { message: "x".repeat(600) })).status, 400);
    assert.equal((await c("POST", "/client-errors", { message: "m", source: "hacker" })).status, 400);
  });
});
