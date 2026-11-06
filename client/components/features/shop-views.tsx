"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Select, Textarea } from "@/components/ui/form";
import { Query, Skeleton } from "@/components/ui/feedback";
import { EmptyState } from "@/components/ui/misc";
import { Photo } from "@/components/ui/photo";
import { productPhoto } from "@/lib/images";
import { useToast } from "@/components/toast";
import { api, errorText, fileUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { formatPaise } from "@/lib/format";
import { useGet } from "@/lib/hooks";
import { payWithRazorpay } from "@/lib/razorpay";
import type { Order, Product } from "@/lib/types";

const catIcon: Record<string, string> = { Food: "🍖", Toys: "🧸", Accessories: "🦮" };

export function ProductGrid() {
  const [category, setCategory] = useState("");
  const q = useGet<Product[]>(`/products${category ? `?category=${category}` : ""}`, ["products", category]);
  const { add, lines } = useCart();
  const toast = useToast();
  return (
    <>
      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Category">
        {["", "Food", "Toys", "Accessories"].map((c) => (
          <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className={`rounded-full border px-4 py-1.5 text-sm font-medium ${category === c ? "border-primary bg-primary-soft text-primary" : "border-border text-muted hover:text-foreground"}`}>{c || "All"}</button>
        ))}
      </div>
      <Query q={q} skeleton={<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-64" />)}</div>}>
        {(list) => list.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {list.map((p) => {
              const inCart = lines.find((l) => l.productId === p._id)?.qty ?? 0;
              return (
                <li key={p._id}>
                  <Card className="flex h-full flex-col overflow-hidden">
                    <Photo src={p.images[0] ? fileUrl(p.images[0]) : productPhoto(p.category)} alt={p.name} fallback={catIcon[p.category ?? ""] ?? "🐾"} className="h-44 w-full" />
                    <CardBody className="flex flex-1 flex-col">
                      <p className="text-xs text-muted">{p.category}</p>
                      <h3 className="font-semibold">{p.name}</h3>
                      <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted">{p.description}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-lg font-semibold">{formatPaise(p.price)}</p>
                        {p.stock <= 0 ? <Badge tone="danger">Sold out</Badge> : <Button size="sm" disabled={inCart >= p.stock} onClick={() => { add({ productId: p._id, name: p.name, price: p.price }); toast("success", `${p.name} added to cart`); }}>{inCart ? `Add (${inCart})` : "Add"}</Button>}
                      </div>
                    </CardBody>
                  </Card>
                </li>
              );
            })}
          </ul>
        ) : <EmptyState icon="🛍️" title="No products here yet" />}
      </Query>
    </>
  );
}

export function CartView() {
  const { lines, setQty, clear, total } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  if (!lines.length) return <EmptyState icon="🛒" title="Your cart is empty" action={<ButtonLink href="/shop">Browse the shop</ButtonLink>} />;

  async function checkout() {
    if (!user) return router.push("/login?next=/shop/cart");
    setBusy(true);
    try {
      const order = await api<Order>("/orders", { method: "POST", body: { items: lines.map((l) => ({ productId: l.productId, qty: l.qty })), address } });
      const checkoutData = await api<Parameters<typeof payWithRazorpay>[0]>(`/payments/shop/${order._id}`, { method: "POST" });
      if (await payWithRazorpay(checkoutData, user)) { clear(); toast("success", "Order placed!"); router.push("/owner/orders"); }
    } catch (e) { toast("error", errorText(e)); }
    setBusy(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <Card><CardBody>
        <ul className="divide-y divide-border">
          {lines.map((l) => (
            <li key={l.productId} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0"><p className="font-medium">{l.name}</p><p className="text-sm text-muted">{formatPaise(l.price)} each</p></div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" aria-label={`Decrease ${l.name}`} onClick={() => setQty(l.productId, l.qty - 1)}>−</Button>
                <span className="w-6 text-center text-sm" aria-live="polite">{l.qty}</span>
                <Button size="sm" variant="secondary" aria-label={`Increase ${l.name}`} onClick={() => setQty(l.productId, l.qty + 1)}>+</Button>
                <p className="w-24 text-right font-medium">{formatPaise(l.price * l.qty)}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardBody></Card>
      <Card className="self-start"><CardBody className="space-y-4">
        <h2 className="font-semibold">Checkout</h2>
        <Field label="Delivery address" htmlFor="addr" hint="At least 10 characters"><Textarea id="addr" value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
        <div className="flex justify-between border-t border-border pt-3 font-semibold"><span>Total</span><span>{formatPaise(total)}</span></div>
        <Button className="w-full" loading={busy} disabled={address.trim().length < 10} onClick={checkout}>Pay {formatPaise(total)}</Button>
        <p className="text-xs text-muted">Prices are re-checked on the server when you pay.</p>
      </CardBody></Card>
    </div>
  );
}

export function MyOrders() {
  const q = useGet<Order[]>("/orders/mine", ["orders", "mine"]);
  return (
    <Query q={q}>
      {(list) => list.length ? (
        <ul className="space-y-4">
          {list.map((o) => (
            <li key={o._id}><Card><CardBody>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted">Order #{o._id.slice(-6)} · {new Date(o.createdAt).toLocaleDateString("en-IN")}</p>
                <Badge tone={o.status === "DELIVERED" ? "success" : o.status === "CANCELLED" ? "danger" : "info"}>{o.status.replace("_", " ")}</Badge>
              </div>
              <ul className="mt-3 text-sm">{o.items.map((i) => <li key={i.productId} className="flex justify-between"><span>{i.qty} × {i.name}</span><span>{formatPaise(i.qty * i.price)}</span></li>)}</ul>
              <p className="mt-3 border-t border-border pt-3 text-right font-semibold">{formatPaise(o.total)}</p>
            </CardBody></Card></li>
          ))}
        </ul>
      ) : <EmptyState icon="📦" title="No orders yet" action={<Link href="/shop" className="font-medium text-primary underline">Visit the shop</Link>} />}
    </Query>
  );
}

export { Select };
