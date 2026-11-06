import { Order, Product } from "../models/index.js";
import { badRequest, conflict, notFound } from "../utils/http.js";

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
  return Order.create({ userId: user._id, address, ...priced });
}

const NEXT = { PLACED: ["PACKED", "CANCELLED"], PACKED: ["SHIPPED"], SHIPPED: ["DELIVERED"] };
export async function advanceOrder(orderId, status) {
  const order = await Order.findById(orderId);
  if (!order) throw notFound("Order not found");
  if (!NEXT[order.status]?.includes(status)) throw conflict(`Cannot move from ${order.status} to ${status}`);
  order.status = status;
  await order.save();
  return order;
}
