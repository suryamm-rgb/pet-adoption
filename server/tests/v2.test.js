process.env.NODE_ENV = "test";
process.env.MONGO_URI = "mongodb://127.0.0.1:27017/pet-platform-test-v2";

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import http from "node:http";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const { createApp } = await import("../app.js");
const { connectDb } = await import("../config/db.js");
const models = await import("../models/index.js");
const { signPayment } = await import("../services/razorpayService.js");

let server;
let base;

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

describe("version 2: adoption, sale and shop", () => {
  const seller = client();
  const buyer = client();
  const admin = client();
  let listingId; let saleId;

  test("setup users", async () => {
    await client()("POST", "/auth/register", { name: "Founder", email: "f@t.test", password: "Password123" }); // first user is admin
    await seller("POST", "/auth/register", { name: "Shelter", email: "s@t.test", password: "Password123" });
    await buyer("POST", "/auth/register", { name: "Buyer", email: "b@t.test", password: "Password123" });
    await models.User.create({ name: "Admin", email: "a@t.test", roles: ["admin"], passwordHash: await bcrypt.hash("Password123", 4), emailVerified: true });
    await admin("POST", "/auth/login", { email: "a@t.test", password: "Password123" });
    assert.equal((await seller("POST", "/auth/roles", { role: "seller" })).data.user.roles.includes("seller"), true);
  });

  test("listings need admin approval before they are public", async () => {
    const l = await seller("POST", "/listings", { title: "Friendly Beagle", mode: "adopt", petType: "Dog", city: "Pune" });
    assert.equal(l.status, 201);
    listingId = l.data._id;
    assert.equal((await buyer("GET", "/listings?mode=adopt")).data.length, 0);
    assert.equal((await buyer("PATCH", `/admin/listings/${listingId}/approve`)).status, 403);
    assert.equal((await admin("PATCH", `/admin/listings/${listingId}/approve`)).data.status, "approved");
    assert.equal((await buyer("GET", "/listings?mode=adopt&city=pu")).data.length, 1);
  });

  test("adoption request -> approve -> handover transfers ownership", async () => {
    const pet = (await seller("POST", "/pets", { name: "Beagle", type: "Dog" })).data;
    await models.Listing.updateOne({ _id: listingId }, { petId: pet._id });
    const own = await seller("POST", `/listings/${listingId}/requests`, { message: "hi" });
    assert.equal(own.status, 400);
    const req = await buyer("POST", `/listings/${listingId}/requests`, { message: "I have a garden" });
    assert.equal(req.status, 201);
    assert.equal((await buyer("POST", `/listings/${listingId}/requests`, {})).status, 409);
    assert.equal((await buyer("PATCH", `/listings/requests/${req.data._id}/status`, { status: "approved" })).status, 403);
    assert.equal((await seller("PATCH", `/listings/requests/${req.data._id}/status`, { status: "approved" })).data.status, "approved");
    assert.equal((await seller("PATCH", `/listings/requests/${req.data._id}/status`, { status: "completed" })).data.status, "completed");
    const moved = await models.Pet.findById(pet._id);
    assert.equal(String(moved.ownerId), String((await buyer("GET", "/auth/me")).data.user.id));
  });

  test("sale: payment is held then buyer confirms handover", async () => {
    saleId = (await seller("POST", "/listings", { title: "Persian kitten", mode: "sell", petType: "Cat", price: 500000, city: "Pune" })).data._id;
    await admin("PATCH", `/admin/listings/${saleId}/approve`);
    const o = await buyer("POST", `/payments/sale/${saleId}`);
    assert.equal(o.data.amount, 500000);
    const sig = signPayment(o.data.razorpayOrderId, "pay_sale");
    assert.equal((await buyer("POST", "/payments/verify", { razorpay_order_id: o.data.razorpayOrderId, razorpay_payment_id: "pay_sale", razorpay_signature: sig })).status, 200);
    assert.equal((await models.Listing.findById(saleId)).status, "reserved");
    assert.equal((await seller("POST", `/listings/${saleId}/handover`)).status, 409); // only the buyer confirms
    assert.equal((await buyer("POST", `/listings/${saleId}/handover`)).data.status, "closed");
  });

  test("shop: server prices the cart, stock decrements on payment, status advances in order", async () => {
    await seller("POST", "/auth/roles", { role: "seller" });
    const product = (await seller("POST", "/products", { name: "Dog food", category: "Food", price: 129900, stock: 3 })).data;
    assert.equal((await buyer("POST", "/products", { name: "x", price: 1 })).status, 403);

    const cart = await buyer("POST", "/cart", { items: [{ productId: product._id, qty: 2 }] });
    assert.equal(cart.data.total, 259800);
    assert.equal((await buyer("POST", "/cart", { items: [{ productId: product._id, qty: 5 }] })).status, 409);

    const order = (await buyer("POST", "/orders", { items: [{ productId: product._id, qty: 2 }], address: "12 Park Road, Pune 411001" })).data;
    assert.equal(order.status, "PENDING_PAYMENT");
    const pay = (await buyer("POST", `/payments/shop/${order._id}`)).data;
    await buyer("POST", "/payments/verify", { razorpay_order_id: pay.razorpayOrderId, razorpay_payment_id: "pay_shop", razorpay_signature: signPayment(pay.razorpayOrderId, "pay_shop") });
    assert.equal((await models.Order.findById(order._id)).status, "PLACED");
    assert.equal((await models.Product.findById(product._id)).stock, 1);

    assert.equal((await admin("PATCH", `/orders/${order._id}/status`, { status: "DELIVERED" })).status, 409); // cannot skip steps
    for (const s of ["PACKED", "SHIPPED", "DELIVERED"]) assert.equal((await admin("PATCH", `/orders/${order._id}/status`, { status: s })).data.status, s);
  });
});
