"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal, Query } from "@/components/ui/feedback";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatPaise } from "@/lib/format";
import { useAction, useGet } from "@/lib/hooks";
import { idOf, nameOf, type AdoptionRequest, type Listing, type Product } from "@/lib/types";
import { Chat } from "./chat";
import { ListingCard } from "./listing-views";

const reqTone = (s: string) => (s === "approved" ? "success" : s === "rejected" ? "danger" : s === "completed" ? "brand" : "warning");

export function MyListings() {
  const q = useGet<Listing[]>("/listings/mine", ["listings", "mine"]);
  return (
    <>
      <PageHeader title="My listings" description="Adoption and sale listings you created." action={<ButtonLink href="/seller/listings/new">New listing</ButtonLink>} />
      <Query q={q}>
        {(list) => list.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((l) => (
              <li key={l._id} className="space-y-2">
                <ListingCard l={l} />
                <div className="flex items-center justify-between px-1">
                  <Badge tone={l.status === "approved" ? "success" : l.status === "pending" ? "warning" : l.status === "rejected" ? "danger" : "neutral"}>{l.status}</Badge>
                  {l.mode === "sell" && l.status === "reserved" && l.buyerId && <span className="text-xs text-muted">Buyer paid, awaiting handover</span>}
                </div>
              </li>
            ))}
          </ul>
        ) : <EmptyState icon="📋" title="No listings yet" action={<ButtonLink href="/seller/listings/new">Create a listing</ButtonLink>} />}
      </Query>
    </>
  );
}

export function IncomingRequests() {
  const q = useGet<AdoptionRequest[]>("/listings/requests/incoming", ["requests", "incoming"]);
  const [chat, setChat] = useState<AdoptionRequest | null>(null);
  const setStatus = useAction(({ id, status }: { id: string; status: string }) => api(`/listings/requests/${id}/status`, { method: "PATCH", body: { status } }), { success: "Updated", invalidate: [["requests"], ["listings"]] });
  return (
    <>
      <PageHeader title="Adoption requests" description="Approve to reserve the pet, then mark handed over." />
      <Query q={q}>
        {(list) => list.length ? (
          <ul className="space-y-3">{list.map((r) => (
            <li key={r._id}><Card><CardBody className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><p className="font-semibold">{nameOf(r.adopterId)}</p><p className="text-sm text-muted">for {(r.listingId as Listing).title} · {formatDate(r.createdAt)}</p></div>
                <Badge tone={reqTone(r.status)}>{r.status}</Badge>
              </div>
              {r.message && <p className="rounded-lg bg-surface-muted p-3 text-sm">{r.message}</p>}
              <div className="flex flex-wrap gap-2">
                {r.status === "pending" && <><Button size="sm" onClick={() => setStatus.mutate({ id: r._id, status: "approved" })}>Approve</Button><Button size="sm" variant="secondary" onClick={() => setStatus.mutate({ id: r._id, status: "rejected" })}>Reject</Button></>}
                {r.status === "approved" && <Button size="sm" variant="accent" onClick={() => confirm("Confirm the pet has been handed over?") && setStatus.mutate({ id: r._id, status: "completed" })}>Mark handed over</Button>}
                <Button size="sm" variant="ghost" onClick={() => setChat(r)}>Message</Button>
              </div>
            </CardBody></Card></li>
          ))}</ul>
        ) : <EmptyState icon="💞" title="No requests yet" />}
      </Query>
      <Modal open={!!chat} onClose={() => setChat(null)} title={chat ? `Chat with ${nameOf(chat.adopterId)}` : "Chat"}>
        {chat && <Chat listingId={idOf(chat.listingId)} withUser={idOf(chat.adopterId)} title="Messages" />}
      </Modal>
    </>
  );
}

export function SellerProducts() {
  const { user } = useAuth();
  const q = useGet<Product[]>("/products", ["products", "all"]);
  const [files, setFiles] = useState<FileList | null>(null);
  const create = useAction(async (d: Record<string, unknown>) => {
    const p = await api<Product>("/products", { method: "POST", body: d });
    if (files?.length) { const form = new FormData(); [...files].forEach((f) => form.append("files", f)); await api(`/products/${p._id}/images`, { method: "POST", form }); }
    return p;
  }, { success: "Product added", invalidate: [["products"]] });
  const update = useAction(({ id, data }: { id: string; data: Record<string, unknown> }) => api(`/products/${id}`, { method: "PUT", body: data }), { success: "Saved", invalidate: [["products"]] });
  return (
    <>
      <PageHeader title="Products" description="Items you sell in the pet shop." />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Query q={q}>
          {(list) => {
            const mine = list.filter((p) => p.sellerId === user?.id);
            return mine.length ? (
              <ul className="space-y-3">{mine.map((p) => (
                <li key={p._id}><Card><CardBody className="flex flex-wrap items-center justify-between gap-3">
                  <div><p className="font-medium">{p.name}</p><p className="text-sm text-muted">{p.category} · {formatPaise(p.price)} · {p.stock} in stock</p></div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => { const s = prompt("New stock", String(p.stock)); if (s !== null && !Number.isNaN(Number(s))) update.mutate({ id: p._id, data: { stock: Number(s) } }); }}>Edit stock</Button>
                    <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: p._id, data: { isActive: false } })}>Hide</Button>
                  </div>
                </CardBody></Card></li>
              ))}</ul>
            ) : <EmptyState icon="🛍️" title="No products yet" text="Add your first product using the form." />;
          }}
        </Query>
        <Card className="self-start"><CardBody>
          <h2 className="mb-3 font-semibold">Add product</h2>
          <form className="space-y-3" onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const d = new FormData(form);
            create.mutate({ name: d.get("name"), category: d.get("category"), price: Math.round(Number(d.get("price")) * 100), stock: Number(d.get("stock")), description: d.get("description") });
            form.reset();
          }}>
            <Field label="Name" htmlFor="pn"><Input id="pn" name="name" required /></Field>
            <Field label="Category" htmlFor="pc"><Select id="pc" name="category"><option>Food</option><option>Toys</option><option>Accessories</option></Select></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (₹)" htmlFor="pp"><Input id="pp" name="price" type="number" min="1" required /></Field>
              <Field label="Stock" htmlFor="ps"><Input id="ps" name="stock" type="number" min="0" defaultValue="10" required /></Field>
            </div>
            <Field label="Description" htmlFor="pd"><Textarea id="pd" name="description" /></Field>
            <Field label="Images" htmlFor="pi"><Input id="pi" type="file" accept="image/*" multiple className="py-1.5" onChange={(e) => setFiles(e.target.files)} /></Field>
            <Button type="submit" className="w-full" loading={create.isPending}>Add product</Button>
          </form>
        </CardBody></Card>
      </div>
    </>
  );
}
