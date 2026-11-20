import { Order, Payment, Product } from "../models/index.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/http.js";
import { notify } from "./notify.js";
import { refundPayment } from "./razorpayService.js";

/** Price cart items from the database; never trust client prices. */
export async function priceCart(items) {
  const products = await Product.find({ _id: { $in: items.map((i) => i.productId) }, isActive: true });
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const lines = items.map((i) => {
    const p = byId.get(String(i.productId));
    if (!p) throw notFound("A product in your cart is unavailable");
    if (p.stock < i.qty) throw conflict(`Only ${p.stock} left of ${p.name}`);
    return { productId: p._id, name: p.name, qty: i.qty, price: p.price };
  });
  return { items: lines, total: lines.reduce((s, l) => s + l.price * l.qty, 0) };
}

export async function createOrder(user, { items, address }) {
  if (!items.length) throw badRequest("Cart is empty");
  const priced = await priceCart(items);
  return Order.create({ userId: user._id, address, ...priced, statusHistory: [{ status: "PENDING_PAYMENT" }] });
}

const NEXT = { PLACED: ["PACKED"], PACKED: ["SHIPPED"], SHIPPED: ["DELIVERED"] };

/** Admin, or a seller who sells at least one item in the order. */
async function assertCanManage(actor, order) {
  if (actor.roles.includes("admin")) return;
  const sells = await Product.exists({ _id: { $in: order.items.map((i) => i.productId) }, sellerId: actor._id });
  if (!sells) throw forbidden("This order does not contain your products");
}

export async function advanceOrder(actor, orderId, status, { courier, trackingNumber } = {}) {
  const order = await Order.findById(orderId);
  if (!order) throw notFound("Order not found");
  await assertCanManage(actor, order);
  if (status === "CANCELLED") return cancelOrder(actor, orderId, "Cancelled by seller");
  if (!NEXT[order.status]?.includes(status)) throw conflict(`Cannot move from ${order.status} to ${status}`);
  order.status = status;
  order.statusHistory.push({ status });
  if (status === "SHIPPED") order.shipment = { courier, trackingNumber, shippedAt: new Date() };
  await order.save();
  const copy = {
    PACKED: ["order_packed", "Your order is packed", "The seller has packed your order and will ship it soon."],
    SHIPPED: ["order_shipped", "Your order is on its way", `Shipped with ${courier}. Tracking number: ${trackingNumber}.`],
    DELIVERED: ["order_delivered", "Your order was delivered", "Enjoy! Let us know if anything is wrong."],
  }[status];
  await notify(order.userId, { type: copy[0], title: copy[1], body: copy[2], link: "/owner/orders" });
  return order;
}

/** Buyer can cancel until the order is packed; seller or admin too (stock problems). Paid orders are refunded in full and restocked. */
export async function cancelOrder(actor, orderId, reason = "") {
  const order = await Order.findById(orderId);
  if (!order) throw notFound("Order not found");
  const isBuyer = order.userId.equals(actor._id);
  if (!isBuyer) await assertCanManage(actor, order);
  const before = order.status;
  const claimed = await Order.findOneAndUpdate(
    { _id: orderId, status: { $in: ["PENDING_PAYMENT", "PLACED"] } },
    { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason, $push: { statusHistory: { status: "CANCELLED" } } },
    { returnDocument: "after" },
  );
  if (!claimed) throw conflict("This order can no longer be cancelled");

  if (before === "PLACED") {
    await Promise.all(claimed.items.map((i) => Product.updateOne({ _id: i.productId }, { $inc: { stock: i.qty } })));
    const payment = await Payment.findOne({ orderId, status: "captured" });
    if (payment) {
      const refund = await refundPayment(payment.razorpayPaymentId, payment.amount);
      payment.refunds.push({ id: refund.id, amount: payment.amount });
      payment.status = "refunded";
      await payment.save();
      claimed.refundAmount = payment.amount;
      await claimed.save();
    }
  }
  if (!isBuyer) await notify(claimed.userId, { type: "order_cancelled", title: "Order cancelled", body: reason || "The seller cancelled your order. Any payment is refunded.", link: "/owner/orders" });
  return claimed;
}
