process.env.NODE_ENV = "test";
process.env.MONGO_URI = "mongodb://127.0.0.1:27017/pet-platform-test-v4";

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import http from "node:http";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const { createApp } = await import("../app.js");
const { connectDb } = await import("../config/db.js");
const { env } = await import("../config/env.js");
const models = await import("../models/index.js");
const { smsOutbox } = await import("../services/smsService.js");
const { notify } = await import("../services/notify.js");
const { setPushTransport } = await import("../services/pushService.js");
const { setGoogleVerifier } = await import("../services/googleAuthService.js");
const { toE164 } = await import("../utils/phone.js");

let server;
let base;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function client() {
  let cookie = "";
  return async (method, path, body) => {
    const res = await fetch(base + path, { method, headers: { ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    const text = await res.text();
    try { return { status: res.status, data: JSON.parse(text) }; } catch { return { status: res.status, data: text }; }
  };
}
const register = async (c, name, email, extra = {}) => (await c("POST", "/auth/register", { name, email, password: "Password123", ...extra })).data.user;

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

describe("phone numbers", () => {
  test("normalise to E.164", () => {
    assert.equal(toE164("98765 43210"), "+919876543210");
    assert.equal(toE164("+1 (415) 555-2671"), "+14155552671");
    assert.equal(toE164("09876543210"), "+919876543210");
    assert.equal(toE164("123"), null);
  });
});

describe("walk and location check-ins", () => {
  const owner = client();
  const caretaker = client();
  const other = client();
  let booking;

  test("only the caretaker, only while in care, rate limited, visible to the owner", async () => {
    await client()("POST", "/auth/register", { name: "Founder", email: "founder@v4.test", password: "Password123" });
    const o = await register(owner, "Olive", "olive@v4.test");
    const c = await register(caretaker, "Carl", "carl@v4.test", { role: "caretaker" });
    await register(other, "Nosy", "nosy@v4.test");
    const pet = await models.Pet.create({ ownerId: o.id, name: "Rex", type: "Dog" });
    booking = await models.Booking.create({ ownerId: o.id, caretakerId: c.id, petId: pet._id, startDate: new Date(), endDate: new Date(Date.now() + 86_400_000), days: 2, status: "PAID" });

    const spot = { kind: "walk", lat: 18.5204, lng: 73.8567, accuracy: 12, note: "Morning walk at the park" };
    assert.equal((await caretaker("POST", `/bookings/${booking._id}/checkins`, spot)).status, 409); // not in care yet
    await models.Booking.updateOne({ _id: booking._id }, { status: "IN_CARE" });

    assert.equal((await owner("POST", `/bookings/${booking._id}/checkins`, spot)).status, 403); // owners cannot post
    assert.equal((await caretaker("POST", `/bookings/${booking._id}/checkins`, { ...spot, lat: 123 })).status, 400);
    assert.equal((await caretaker("POST", `/bookings/${booking._id}/checkins`, spot)).status, 201);

    const list = await owner("GET", `/bookings/${booking._id}/checkins`);
    assert.equal(list.data.length, 1);
    assert.equal(list.data[0].lat, 18.5204);
    assert.equal((await other("GET", `/bookings/${booking._id}/checkins`)).status, 403); // strangers see nothing
    const note = await models.Notification.findOne({ userId: o.id, type: "checkin" });
    assert.match(note.title, /Rex is out on a walk/);

    await caretaker("POST", `/bookings/${booking._id}/checkins`, spot);
    await caretaker("POST", `/bookings/${booking._id}/checkins`, spot);
    assert.equal((await caretaker("POST", `/bookings/${booking._id}/checkins`, spot)).status, 409); // 4th within a minute
  });
});

describe("phone verification and notification preferences", () => {
  const u = client();
  test("OTP flow with cooldown, wrong codes and a changed number", async () => {
    await register(u, "Pia", "pia@v4.test", { phone: "9876543210" });
    smsOutbox.length = 0;
    const sent = await u("POST", "/auth/phone/send-otp");
    assert.equal(sent.status, 200);
    assert.match(sent.data.sentTo, /•/);
    const code = sent.data.devCode; // only exposed without an SMS provider and outside production
    assert.match(code, /^\d{6}$/);
    assert.match(smsOutbox.at(-1).body, new RegExp(code));
    assert.equal((await u("POST", "/auth/phone/send-otp")).status, 409); // 60 s cooldown

    const wrong = code === "000000" ? "111111" : "000000";
    assert.equal((await u("POST", "/auth/phone/verify-otp", { code: wrong })).status, 400);
    assert.equal((await u("POST", "/auth/phone/verify-otp", { code: "12" })).status, 400);
    const ok = await u("POST", "/auth/phone/verify-otp", { code });
    assert.equal(ok.status, 200);
    assert.equal(ok.data.user.phoneVerified, true);
    assert.equal((await u("POST", "/auth/phone/verify-otp", { code })).status, 400); // single use

    const changed = await u("PATCH", "/auth/me", { phone: "9123456789" });
    assert.equal(changed.data.user.phoneVerified, false); // new number, verify again
  });

  test("five wrong codes lock the code", async () => {
    const x = client();
    await register(x, "Max", "max@v4.test", { phone: "9000000001" });
    const { data } = await x("POST", "/auth/phone/send-otp");
    const wrong = data.devCode === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) await x("POST", "/auth/phone/verify-otp", { code: wrong });
    assert.equal((await x("POST", "/auth/phone/verify-otp", { code: data.devCode })).status, 409);
  });

  test("WhatsApp alerts need a verified phone, then arrive for chosen events only", async () => {
    const w = client();
    const user = await register(w, "Wanda", "wanda@v4.test", { phone: "9811111111" });
    assert.equal((await w("PATCH", "/auth/preferences", { whatsapp: true })).status, 400); // not verified yet
    const { data } = await w("POST", "/auth/phone/send-otp");
    await w("POST", "/auth/phone/verify-otp", { code: data.devCode });
    assert.equal((await w("PATCH", "/auth/preferences", { whatsapp: true })).data.user.notifyPrefs.whatsapp, true);

    smsOutbox.length = 0;
    await notify(user.id, { type: "booking_accepted", title: "Booking accepted", body: "Pay now", link: "/owner/bookings/1" });
    await notify(user.id, { type: "message", title: "Chat message", body: "hi" }); // not a WhatsApp event
    await wait(250);
    const wa = smsOutbox.filter((m) => m.channel === "whatsapp");
    assert.equal(wa.length, 1);
    assert.equal(wa[0].to, "+919811111111");
    assert.match(wa[0].body, /Booking accepted/);

    await w("PATCH", "/auth/preferences", { whatsapp: false });
    smsOutbox.length = 0;
    await notify(user.id, { type: "booking_accepted", title: "Again", body: "x" });
    await wait(250);
    assert.equal(smsOutbox.filter((m) => m.channel === "whatsapp").length, 0);
  });

  test("phone verification can be made mandatory for caretakers", async () => {
    const c = client();
    const care = await register(c, "Cara", "cara@v4.test", { role: "caretaker", phone: "9822222222" });
    await models.CaretakerProfile.updateOne({ userId: care.id }, { idProofUrl: "/x", addressProofUrl: "/y", pricePerDay: 40000 });
    env.requirePhoneVerification = true;
    try {
      assert.equal((await c("POST", "/caretakers/me/submit")).status, 400);
      const { data } = await c("POST", "/auth/phone/send-otp");
      await c("POST", "/auth/phone/verify-otp", { code: data.devCode });
      assert.equal((await c("POST", "/caretakers/me/submit")).status, 200);
    } finally {
      env.requirePhoneVerification = false;
    }
  });
});

describe("web push", () => {
  test("subscribe, deliver on notify, drop dead subscriptions", async () => {
    const p = client();
    const user = await register(p, "Pushy", "pushy@v4.test");
    const sub = { endpoint: "https://push.example.com/abc", keys: { p256dh: "BKey", auth: "authKey" } };
    assert.equal((await p("POST", "/auth/push/subscribe", { endpoint: "nope", keys: {} })).status, 400);
    assert.equal((await p("POST", "/auth/push/subscribe", sub)).status, 201);
    assert.equal((await p("POST", "/auth/push/subscribe", sub)).status, 201); // same browser twice: one row
    assert.equal(await models.PushSubscription.countDocuments({ userId: user.id }), 1);

    const sent = [];
    setPushTransport(async (s, payload) => { sent.push({ endpoint: s.endpoint, payload: JSON.parse(payload) }); });
    await notify(user.id, { type: "booking_accepted", title: "Booking accepted", body: "Pay now", link: "/owner/bookings/1" });
    await wait(250);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].payload.title, "Booking accepted");

    await p("PATCH", "/auth/preferences", { push: false });
    await notify(user.id, { type: "booking_accepted", title: "Muted", body: "x" });
    await wait(250);
    assert.equal(sent.length, 1); // preference respected

    await p("PATCH", "/auth/preferences", { push: true });
    setPushTransport(async () => { const e = new Error("gone"); e.statusCode = 410; throw e; });
    await notify(user.id, { type: "booking_accepted", title: "Gone", body: "x" });
    await wait(250);
    assert.equal(await models.PushSubscription.countDocuments({ userId: user.id }), 0); // expired subscription removed

    await p("POST", "/auth/push/subscribe", sub);
    assert.equal((await p("POST", "/auth/push/unsubscribe", { endpoint: sub.endpoint })).status, 200);
    assert.equal(await models.PushSubscription.countDocuments({ userId: user.id }), 0);
  });
});

describe("google sign-in", () => {
  const credential = "x".repeat(40);
  test("creates, signs in, links by email, and refuses unverified or blocked accounts", async () => {
    setGoogleVerifier(async () => ({ sub: "g-1", email: "Gina@Example.com", email_verified: true, name: "Gina G" }));
    const c = client();
    const first = await c("POST", "/auth/google", { credential, role: "caretaker" });
    assert.equal(first.status, 201);
    assert.equal(first.data.user.email, "gina@example.com");
    assert.equal(first.data.user.emailVerified, true);
    assert.ok(first.data.user.roles.includes("caretaker"));
    assert.equal((await c("GET", "/auth/me")).status, 200); // session cookie set

    const again = await client()("POST", "/auth/google", { credential });
    assert.equal(again.status, 200);
    assert.equal(again.data.created, false);
    assert.equal(await models.User.countDocuments({ email: "gina@example.com" }), 1);

    // an existing password account with the same verified email gets linked, not duplicated
    const pw = client();
    await register(pw, "Hal", "hal@example.com");
    setGoogleVerifier(async () => ({ sub: "g-2", email: "hal@example.com", email_verified: true, name: "Hal" }));
    assert.equal((await client()("POST", "/auth/google", { credential })).status, 200);
    assert.equal((await models.User.findOne({ email: "hal@example.com" })).googleId, "g-2");

    setGoogleVerifier(async () => ({ sub: "g-3", email: "fake@example.com", email_verified: false, name: "Fake" }));
    assert.equal((await client()("POST", "/auth/google", { credential })).status, 401);
    setGoogleVerifier(async () => { throw new Error("bad token"); });
    assert.equal((await client()("POST", "/auth/google", { credential })).status, 401);

    await models.User.updateOne({ email: "gina@example.com" }, { isBlocked: true });
    setGoogleVerifier(async () => ({ sub: "g-1", email: "gina@example.com", email_verified: true, name: "Gina" }));
    assert.equal((await client()("POST", "/auth/google", { credential })).status, 401);
  });
});

describe("automatic payouts (Razorpay Route, mock)", () => {
  test("caretaker onboards, the payout transfers automatically; without setup it waits", async () => {
    const admin = client();
    await models.User.create({ name: "Admin", email: "admin@v4.test", roles: ["admin"], passwordHash: await bcrypt.hash("Password123", 4), emailVerified: true });
    await admin("POST", "/auth/login", { email: "admin@v4.test", password: "Password123" });
    const c = client();
    const care = await register(c, "Rita", "rita@v4.test", { role: "caretaker", phone: "9833333333" });
    const owner = await register(client(), "Omar", "omar@v4.test");
    const pet = await models.Pet.create({ ownerId: owner.id, name: "Bo", type: "Dog" });
    const mkBooking = async () => {
      const b = await models.Booking.create({ ownerId: owner.id, caretakerId: care.id, petId: pet._id, startDate: new Date(), endDate: new Date(), days: 1, ownerPays: 110000, caretakerGets: 100000, status: "COMPLETED", completedAt: new Date(Date.now() - 72 * 3_600_000), payoutStatus: "pending" });
      await models.Payment.create({ bookingId: b._id, type: "booking", amount: 110000, status: "captured", razorpayOrderId: `order_${b._id}`, razorpayPaymentId: `pay_${b._id}` });
      return b;
    };

    env.payoutMode = "route";
    try {
      const b1 = await mkBooking();
      // not onboarded: the admin is told to wait, nothing is paid
      assert.equal((await admin("POST", `/admin/payouts/${b1._id}`, {})).status, 409);
      assert.equal((await models.Booking.findById(b1._id)).payoutStatus, "pending");

      const bad = await c("POST", "/caretakers/me/payout-account", { pan: "abc", address: { street: "1 Road", city: "Pune", state: "MH", postalCode: "411001" } });
      assert.equal(bad.status, 400);
      const address = { street: "12 Garden Road", city: "Pune", state: "Maharashtra", postalCode: "411001" };
      assert.equal((await c("POST", "/caretakers/me/payout-account", { pan: "ABCDE1234F", address })).status, 400); // no bank details yet
      await c("PUT", "/caretakers/me/profile", { bankDetails: { accountName: "Rita R", accountNumber: "123456789012", ifsc: "HDFC0001234" } });
      const ok = await c("POST", "/caretakers/me/payout-account", { pan: "ABCDE1234F", address });
      assert.equal(ok.status, 201);
      assert.equal(ok.data.payoutAccountStatus, "activated");
      assert.match(ok.data.razorpayLinkedAccountId, /^acc_mock_/);
      assert.equal(ok.data.pan, undefined); // the PAN is never stored

      const paid = await admin("POST", `/admin/payouts/${b1._id}`, {});
      assert.equal(paid.status, 200);
      const pay = await models.Payment.findOne({ bookingId: b1._id });
      assert.match(pay.payout.transferId, /^trf_mock_/);
      assert.equal(pay.payout.amount, 100000);
      assert.equal((await admin("POST", `/admin/payouts/${b1._id}`, {})).status, 409); // no double payout

      // the hourly job pays eligible bookings by itself
      const { autoPayouts } = await import("../jobs/index.js");
      const b2 = await mkBooking();
      assert.equal(await autoPayouts(), 1);
      assert.equal((await models.Booking.findById(b2._id)).payoutStatus, "paid");

      // webhook can flip the status
      const { handleWebhook } = await import("../services/paymentService.js");
      await handleWebhook({ event: "account.needs_clarification", payload: { account: { entity: { id: ok.data.razorpayLinkedAccountId, notes: { reason: "PAN mismatch" } } } } });
      const profile = await models.CaretakerProfile.findOne({ userId: care.id });
      assert.equal(profile.payoutAccountStatus, "needs_clarification");
      const b3 = await mkBooking();
      assert.equal((await admin("POST", `/admin/payouts/${b3._id}`, {})).status, 409);
      assert.equal((await admin("POST", `/admin/payouts/${b3._id}`, { manual: true })).status, 200); // bank transfer fallback
    } finally {
      env.payoutMode = "manual";
    }
  });
});

describe("public feature flags", () => {
  test("the website learns which options are available", async () => {
    const { data } = await client()("GET", "/settings/public");
    assert.ok("features" in data);
    assert.equal(data.features.payoutMode, "manual");
    assert.equal(data.features.googleClientId, null);
  });
});
