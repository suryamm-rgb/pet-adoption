process.env.NODE_ENV = "test";
process.env.MONGO_URI = "mongodb://127.0.0.1:27017/pet-platform-test";

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import http from "node:http";
import mongoose from "mongoose";

const { createApp } = await import("../app.js");
const { connectDb } = await import("../config/db.js");
const models = await import("../models/index.js");
const { signPayment, signWebhook } = await import("../services/razorpayService.js");
const { startStays } = await import("../jobs/index.js");
const { calcPricing, calcRefund } = await import("../utils/money.js");

let server;
let base;

function client() {
  let cookie = "";
  return async (method, path, body, { raw } = {}) => {
    const isForm = body instanceof FormData;
    const res = await fetch(base + path, {
      method,
      headers: { ...(cookie ? { cookie } : {}), ...(body && !isForm && !raw ? { "content-type": "application/json" } : {}) },
      body: body ? (isForm || raw ? body : JSON.stringify(body)) : undefined,
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data };
  };
}

const future = (days) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

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

describe("money", () => {
  test("pricing matches the plan example", () => {
    const p = calcPricing({ pricePerDay: 50000, days: 6, feePercent: 10 });
    assert.equal(p.careAmount, 300000);
    assert.equal(p.ownerPays, 330000);
    assert.equal(p.caretakerGets, 300000);
    assert.equal(p.platformEarns, 30000);
  });
  test("refund tiers", () => {
    const rules = [{ hoursBefore: 48, refundPercent: 100 }, { hoursBefore: 24, refundPercent: 50 }];
    const booking = { ownerPays: 330000, careAmount: 300000, startDate: new Date(Date.now() + 72 * 3_600_000) };
    assert.equal(calcRefund({ booking, rules }), 330000);
    booking.startDate = new Date(Date.now() + 30 * 3_600_000);
    assert.equal(calcRefund({ booking, rules }), 150000);
    booking.startDate = new Date(Date.now() + 5 * 3_600_000);
    assert.equal(calcRefund({ booking, rules }), 0);
    assert.equal(calcRefund({ booking, rules, cancelledBy: "caretaker" }), 330000);
  });
});

describe("booking flow", () => {
  const owner = client();
  const caretaker = client();
  const stranger = client();
  const admin = client();
  let caretakerId; let petId; let bookingId; let order;

  test("the first account on an empty database becomes the admin", async () => {
    const first = await client()("POST", "/auth/register", { name: "Founder", email: "founder@t.test", password: "Password123" });
    assert.deepEqual(first.data.user.roles, ["owner", "admin"]);
    const second = await client()("POST", "/auth/register", { name: "Second", email: "second@t.test", password: "Password123" });
    assert.deepEqual(second.data.user.roles, ["owner"]);
  });

  test("register, roles and validation", async () => {
    const bad = await owner("POST", "/auth/register", { name: "x", email: "nope", password: "1" });
    assert.equal(bad.status, 400);
    assert.equal((await owner("POST", "/auth/register", { name: "Ravi", email: "ravi@t.test", password: "Password123" })).status, 201);
    const c = await caretaker("POST", "/auth/register", { name: "Anita", email: "anita@t.test", password: "Password123", role: "caretaker", city: "Bengaluru" });
    caretakerId = c.data.user.id;
    await stranger("POST", "/auth/register", { name: "Eve", email: "eve@t.test", password: "Password123" });
    const a = await models.User.create({ name: "Admin", email: "admin@t.test", roles: ["admin"], passwordHash: await (await import("bcryptjs")).default.hash("Password123", 4), emailVerified: true });
    assert.ok(a);
    assert.equal((await admin("POST", "/auth/login", { email: "admin@t.test", password: "Password123" })).status, 200);
    assert.equal((await owner("GET", "/admin/stats")).status, 403);
    assert.equal((await client()("GET", "/auth/me")).status, 401);
  });

  test("NoSQL operators in login are rejected", async () => {
    const r = await client()("POST", "/auth/login", { email: { $gt: "" }, password: "x" });
    assert.equal(r.status, 400);
  });

  test("caretaker is hidden until admin approves", async () => {
    await caretaker("PUT", "/caretakers/me/profile", { pricePerDay: 50000, acceptedPetTypes: ["Dog"], maxPets: 1, address: "12 Park Road" });
    const early = await caretaker("POST", "/caretakers/me/submit");
    assert.equal(early.status, 400); // documents missing
    for (const kind of ["idProof", "addressProof"]) {
      const f = new FormData();
      f.append("files", new Blob(["%PDF-1.4"], { type: "application/pdf" }), "doc.pdf");
      assert.equal((await caretaker("POST", `/caretakers/me/documents/${kind}`, f)).status, 200);
    }
    assert.equal((await caretaker("POST", "/caretakers/me/submit")).status, 200);
    assert.equal((await owner("GET", "/caretakers")).data.length, 0);
    assert.equal((await admin("PATCH", `/admin/caretakers/${caretakerId}/verify`, { decision: "approve" })).status, 200);
    const list = await owner("GET", "/caretakers?city=beng");
    assert.equal(list.data.length, 1);
    assert.equal(list.data[0].address, undefined);
  });

  test("a vaccination certificate is required before booking", async () => {
    petId = (await owner("POST", "/pets", { name: "Bruno", type: "Dog", breed: "Labrador" })).data._id;
    const body = { caretakerId, petId, startDate: future(5), endDate: future(10) };
    assert.equal((await owner("POST", "/bookings", body)).status, 400);
    const f = new FormData();
    f.append("files", new Blob(["%PDF-1.4"], { type: "application/pdf" }), "vax.pdf");
    assert.equal((await owner("POST", `/pets/${petId}/vaccination`, f)).status, 200);
    const bad = new FormData();
    bad.append("files", new Blob(["x"], { type: "text/plain" }), "x.txt");
    assert.equal((await owner("POST", `/pets/${petId}/vaccination`, bad)).status, 400);
  });

  test("request -> accept -> pay -> in care -> complete", async () => {
    const created = await owner("POST", "/bookings", { caretakerId, petId, startDate: future(5), endDate: future(10) });
    assert.equal(created.status, 201);
    bookingId = created.data._id;
    assert.equal(created.data.days, 6);
    assert.equal(created.data.ownerPays, 330000);

    assert.equal((await stranger("GET", `/bookings/${bookingId}`)).status, 403);
    assert.equal((await owner("PATCH", `/bookings/${bookingId}/accept`)).status, 403); // owner has no caretaker role
    assert.equal((await caretaker("PATCH", `/bookings/${bookingId}/accept`)).data.status, "ACCEPTED");

    const pay = await owner("POST", "/payments/order", { bookingId });
    assert.equal(pay.status, 201);
    order = pay.data;
    assert.equal(order.amount, 330000);

    const forged = await owner("POST", "/payments/verify", { razorpay_order_id: order.razorpayOrderId, razorpay_payment_id: "pay_1", razorpay_signature: "bad" });
    assert.equal(forged.status, 400);
    assert.equal((await owner("GET", `/bookings/${bookingId}`)).data.status, "ACCEPTED");

    const sig = signPayment(order.razorpayOrderId, "pay_1");
    const ok = await owner("POST", "/payments/verify", { razorpay_order_id: order.razorpayOrderId, razorpay_payment_id: "pay_1", razorpay_signature: sig });
    assert.equal(ok.status, 200);
    const b = await owner("GET", `/bookings/${bookingId}`);
    assert.equal(b.data.status, "PAID");
    assert.equal(b.data.caretakerAddress, "12 Park Road"); // revealed only after payment
  });

  test("webhook is signed and idempotent", async () => {
    const event = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_1", order_id: order.razorpayOrderId } } } });
    const url = base.replace("/api", "") + "/api/webhooks/razorpay";
    const bad = await fetch(url, { method: "POST", body: event, headers: { "x-razorpay-signature": "nope" } });
    assert.equal(bad.status, 400);
    for (let i = 0; i < 2; i++) {
      const res = await fetch(url, { method: "POST", body: event, headers: { "x-razorpay-signature": signWebhook(event) } });
      assert.equal(res.status, 200);
    }
    assert.equal(await models.Payment.countDocuments({ razorpayOrderId: order.razorpayOrderId, status: "captured" }), 1);
    assert.equal((await models.Booking.findById(bookingId)).status, "PAID");
  });

  test("double booking is prevented (maxPets = 1)", async () => {
    const other = await stranger("POST", "/pets", { name: "Rex", type: "Dog" });
    await models.Pet.updateOne({ _id: other.data._id }, { vaccinationDocs: ["/uploads/x.pdf"] });
    const r = await stranger("POST", "/bookings", { caretakerId, petId: other.data._id, startDate: future(6), endDate: future(8) });
    assert.equal(r.status, 409);
  });

  test("stay starts, daily update, chat, instruction, complete, review, payout", async () => {
    assert.equal((await caretaker("POST", `/bookings/${bookingId}/updates`, new FormData())).status, 400);
    await models.Booking.updateOne({ _id: bookingId }, { startDate: new Date(Date.now() - 86_400_000) });
    assert.equal(await startStays(), 1);

    const form = new FormData();
    form.append("note", "Bruno had a great walk");
    assert.equal((await caretaker("POST", `/bookings/${bookingId}/updates`, form)).status, 201);
    assert.equal((await owner("GET", `/bookings/${bookingId}/updates`)).data.length, 1);

    assert.equal((await owner("POST", `/bookings/${bookingId}/messages`, { text: "Thanks!" })).status, 201);
    assert.equal((await admin("POST", `/bookings/${bookingId}/messages`, { text: "hi" })).status, 403);
    assert.equal((await caretaker("GET", `/bookings/${bookingId}/messages`)).data.length, 1);

    const instr = await owner("POST", `/bookings/${bookingId}/instructions`, { text: "No chicken please" });
    assert.equal(instr.data.instructions.length, 1);
    const iid = instr.data.instructions[0]._id;
    assert.equal((await caretaker("PATCH", `/bookings/${bookingId}/instructions/${iid}/ack`)).data.instructions[0].acknowledged, true);

    // locked fields cannot change mid-stay, care fields become instructions
    assert.equal((await owner("PUT", `/pets/${petId}`, { breed: "Poodle" })).status, 409);
    assert.equal((await owner("PUT", `/pets/${petId}`, { allergies: "Chicken" })).status, 200);
    assert.equal((await models.Booking.findById(bookingId)).instructions.length, 2);

    assert.equal((await owner("PATCH", `/bookings/${bookingId}/complete`)).data.status, "COMPLETED");
    assert.equal((await owner("POST", `/bookings/${bookingId}/reviews`, { rating: 5, comment: "Great" })).status, 201);
    assert.equal((await owner("POST", `/bookings/${bookingId}/reviews`, { rating: 4 })).status, 409);
    assert.equal((await owner("GET", `/caretakers/${caretakerId}`)).data.ratingAvg, 5);

    assert.equal((await admin("POST", `/admin/payouts/${bookingId}`, {})).status, 409); // dispute window
    assert.equal((await admin("POST", `/admin/payouts/${bookingId}`, { force: true })).data.payoutStatus, "paid");
    assert.equal((await admin("POST", `/admin/payouts/${bookingId}`, { force: true })).status, 409);
  });

  test("cancelling a paid booking refunds by policy and caretaker cancel refunds 100%", async () => {
    const mk = async (daysAhead) => {
      const b = (await owner("POST", "/bookings", { caretakerId, petId, startDate: future(daysAhead), endDate: future(daysAhead + 1) })).data;
      await caretaker("PATCH", `/bookings/${b._id}/accept`);
      const o = (await owner("POST", "/payments/order", { bookingId: b._id })).data;
      await owner("POST", "/payments/verify", { razorpay_order_id: o.razorpayOrderId, razorpay_payment_id: "pay_" + b._id, razorpay_signature: signPayment(o.razorpayOrderId, "pay_" + b._id) });
      return b;
    };
    const far = await mk(30);
    const refunded = await owner("PATCH", `/bookings/${far._id}/cancel`, { reason: "plans changed" });
    assert.equal(refunded.data.status, "CANCELLED");
    assert.equal(refunded.data.refundAmount, far.ownerPays); // 48h+ => 100% incl. fee

    const near = await mk(40);
    await models.Booking.updateOne({ _id: near._id }, { startDate: new Date(Date.now() + 30 * 3_600_000) });
    assert.equal((await owner("PATCH", `/bookings/${near._id}/cancel`)).data.refundAmount, Math.round(near.careAmount / 2));

    const byCaretaker = await mk(50);
    await models.Booking.updateOne({ _id: byCaretaker._id }, { startDate: new Date(Date.now() + 2 * 3_600_000) });
    assert.equal((await caretaker("PATCH", `/bookings/${byCaretaker._id}/cancel`)).data.refundAmount, byCaretaker.ownerPays);
  });

  test("disputes freeze the payout until an admin decides", async () => {
    const b = (await owner("POST", "/bookings", { caretakerId, petId, startDate: future(60), endDate: future(61) })).data;
    await caretaker("PATCH", `/bookings/${b._id}/accept`);
    const o = (await owner("POST", "/payments/order", { bookingId: b._id })).data;
    await owner("POST", "/payments/verify", { razorpay_order_id: o.razorpayOrderId, razorpay_payment_id: "pay_d", razorpay_signature: signPayment(o.razorpayOrderId, "pay_d") });
    await models.Booking.updateOne({ _id: b._id }, { status: "IN_CARE" });
    assert.equal((await owner("POST", `/bookings/${b._id}/disputes`, new FormData())).status, 400);
    const form = new FormData();
    form.append("reason", "Pet came back unwell");
    const d = await owner("POST", `/bookings/${b._id}/disputes`, form);
    assert.equal(d.status, 201);
    assert.equal((await owner("GET", `/bookings/${b._id}`)).data.status, "DISPUTED");
    const resolved = await admin("PATCH", `/admin/disputes/${d.data._id}/resolve`, { decision: "full_refund" });
    assert.equal(resolved.data.status, "resolved");
    const after = await owner("GET", `/bookings/${b._id}`);
    assert.equal(after.data.status, "REFUNDED");
    assert.equal(after.data.refundAmount, b.ownerPays);
  });
});
