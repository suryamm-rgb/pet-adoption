"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, StatCard } from "@/components/ui/card";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { Modal, Query } from "@/components/ui/feedback";
import { Avatar, EmptyState, PageHeader, Section, WelcomeBanner } from "@/components/ui/misc";
import { Table, Td, Th } from "@/components/ui/table";
import { api, errorText, fileUrl } from "@/lib/api";
import { formatDate, formatPaise, rupeesToPaise } from "@/lib/format";
import { useAction, useGet } from "@/lib/hooks";
import { nameOf, type Booking, type CaretakerProfile, type Dispute, type Listing, type Order, type Payment, type Settings, type User } from "@/lib/types";
import { BookingTable } from "./booking-table";

type Stats = { bookingsToday: number; activeStays: number; pendingVerifications: number; openDisputes: number; pendingListings: number; pendingPayouts: number; revenueMonth: number };

export function AdminDashboard() {
  const q = useGet<Stats>("/admin/stats", ["admin", "stats"], { refetchInterval: 60_000 });
  return (
    <>
      <WelcomeBanner title="Admin dashboard" text="What needs attention today." />
      <Query q={q}>
        {(s) => (
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon="📅" label="Bookings today" value={String(s.bookingsToday)} />
              <StatCard icon="🐕" label="Active stays" value={String(s.activeStays)} />
              <StatCard icon="💰" label="Revenue this month" value={formatPaise(s.revenueMonth)} />
              <StatCard icon="💸" label="Payouts to release" value={String(s.pendingPayouts)} />
            </div>
            <Section title="Queues">
              <div className="grid gap-4 sm:grid-cols-3">
                {[["/admin/verifications", "✅", "Pending verifications", s.pendingVerifications], ["/admin/disputes", "⚖️", "Open disputes", s.openDisputes], ["/admin/listings", "📋", "Listings to approve", s.pendingListings]].map(([href, icon, label, n]) => (
                  <Link key={href as string} href={href as string}><Card className="transition hover:-translate-y-0.5 hover:shadow-pop"><CardBody className="flex items-center justify-between"><div><p className="text-sm text-muted">{label}</p><p className="text-2xl font-semibold">{n}</p></div><span className="text-3xl" aria-hidden>{icon}</span></CardBody></Card></Link>
                ))}
              </div>
            </Section>
          </div>
        )}
      </Query>
    </>
  );
}

type PendingProfile = Omit<CaretakerProfile, "userId"> & { userId: { _id: string; name: string; email: string; phone?: string; city?: string } };

export function Verifications() {
  const [status, setStatus] = useState("pending");
  const q = useGet<PendingProfile[]>(`/admin/verifications?status=${status}`, ["admin", "verifications", status]);
  const [rejecting, setRejecting] = useState<PendingProfile | null>(null);
  const [reason, setReason] = useState("");
  const decide = useAction(({ id, decision, reason }: { id: string; decision: "approve" | "reject"; reason?: string }) => api(`/admin/caretakers/${id}/verify`, { method: "PATCH", body: { decision, reason } }), { success: "Done", invalidate: [["admin"]], onSuccess: () => { setRejecting(null); setReason(""); } });
  return (
    <>
      <PageHeader title="Caretaker verification" description="Check ID and address proof, then approve or reject with a reason." />
      <div className="mb-4 flex gap-2" role="tablist">{["pending", "approved", "rejected"].map((s) => <button key={s} role="tab" aria-selected={status === s} onClick={() => setStatus(s)} className={`rounded-full border px-4 py-1.5 text-sm font-medium capitalize ${status === s ? "border-primary bg-primary-soft text-primary" : "border-border text-muted"}`}>{s}</button>)}</div>
      <Query q={q}>
        {(list) => list.length ? (
          <ul className="grid gap-4 lg:grid-cols-2">{list.map((p) => (
            <li key={p.userId._id}><Card><CardBody className="space-y-3">
              <div className="flex items-center gap-3"><Avatar name={p.userId.name} /><div className="min-w-0"><p className="font-semibold">{p.userId.name}</p><p className="truncate text-sm text-muted">{p.userId.email} · {p.userId.phone ?? "no phone"}</p></div></div>
              <p className="text-sm">{p.city} · {formatPaise(p.pricePerDay)}/day · {p.homeType ?? "home type n/a"} · max {p.maxPets} pets</p>
              {p.bio && <p className="line-clamp-3 text-sm text-muted">{p.bio}</p>}
              <div className="flex flex-wrap gap-3 text-sm">
                {p.idProofUrl && <a className="font-medium text-primary underline" href={fileUrl(p.idProofUrl)} target="_blank" rel="noreferrer">ID proof</a>}
                {p.addressProofUrl && <a className="font-medium text-primary underline" href={fileUrl(p.addressProofUrl)} target="_blank" rel="noreferrer">Address proof</a>}
              </div>
              {p.verificationStatus === "pending" && <div className="flex gap-2"><Button size="sm" loading={decide.isPending} onClick={() => decide.mutate({ id: p.userId._id, decision: "approve" })}>Approve</Button><Button size="sm" variant="danger" onClick={() => setRejecting(p)}>Reject</Button></div>}
              {p.rejectionReason && <p className="text-sm text-danger-700">Reason: {p.rejectionReason}</p>}
            </CardBody></Card></li>
          ))}</ul>
        ) : <EmptyState icon="✅" title={`No ${status} profiles`} />}
      </Query>
      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title="Reject verification">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (rejecting) decide.mutate({ id: rejecting.userId._id, decision: "reject", reason }); }}>
          <Field label="Reason (shown to the caretaker)" htmlFor="rr"><Textarea id="rr" value={reason} onChange={(e) => setReason(e.target.value)} required /></Field>
          <Button type="submit" variant="danger" className="w-full" loading={decide.isPending} disabled={!reason.trim()}>Reject</Button>
        </form>
      </Modal>
    </>
  );
}

export function ListingApprovals() {
  const q = useGet<(Listing & { sellerId: string | { name: string } })[]>("/admin/listings/pending", ["admin", "listings"]);
  const review = useAction(({ id, action }: { id: string; action: "approve" | "reject" }) => api(`/admin/listings/${id}/${action}`, { method: "PATCH" }), { success: "Done", invalidate: [["admin"]] });
  return (
    <>
      <PageHeader title="Listing approvals" description="Check species rules, documents and city rules before approving." />
      <Query q={q}>
        {(list) => list.length ? (
          <ul className="space-y-3">{list.map((l) => (
            <li key={l._id}><Card><CardBody className="flex flex-wrap items-center justify-between gap-3">
              <div><div className="flex items-center gap-2"><p className="font-semibold">{l.title}</p><Badge tone={l.mode === "sell" ? "warning" : "brand"}>{l.mode}</Badge></div><p className="text-sm text-muted">by {nameOf(l.sellerId as { name: string })} · {l.petType} · {l.city}{l.mode === "sell" ? ` · ${formatPaise(l.price)}` : ""}</p>{l.description && <p className="mt-1 line-clamp-2 text-sm">{l.description}</p>}</div>
              <div className="flex gap-2"><Button size="sm" onClick={() => review.mutate({ id: l._id, action: "approve" })}>Approve</Button><Button size="sm" variant="danger" onClick={() => review.mutate({ id: l._id, action: "reject" })}>Reject</Button></div>
            </CardBody></Card></li>
          ))}</ul>
        ) : <EmptyState icon="📋" title="Nothing waiting for approval" />}
      </Query>
    </>
  );
}

export function AllBookings() {
  const q = useGet<Booking[]>("/admin/bookings", ["admin", "bookings"]);
  return (
    <>
      <PageHeader title="Bookings" description="Every booking on the platform." />
      <Query q={q}>{(list) => <BookingTable rows={list} viewer="admin" base="/admin/bookings" />}</Query>
    </>
  );
}

export function PaymentsAndPayouts() {
  const payouts = useGet<Booking[]>("/admin/payouts/pending", ["admin", "payouts"]);
  const payments = useGet<Payment[]>("/admin/payments", ["admin", "payments"]);
  const pay = useAction(({ id, force }: { id: string; force: boolean }) => api(`/admin/payouts/${id}`, { method: "POST", body: { force } }), { success: "Marked as paid", invalidate: [["admin"]] });
  const refund = useAction(({ id, amount }: { id: string; amount: number }) => api(`/payments/${id}/refund`, { method: "POST", body: { amount } }), { success: "Refund processed", invalidate: [["admin"]] });
  return (
    <>
      <PageHeader title="Payments and payouts" description="Release caretaker payouts and manage refunds." />
      <div className="space-y-8">
        <Section title="Payouts waiting">
          <Query q={payouts}>
            {(list) => list.length ? (
              <Table><thead><tr><Th>Caretaker</Th><Th>Completed</Th><Th>Amount</Th><Th><span className="sr-only">Action</span></Th></tr></thead>
                <tbody>{list.map((b) => <tr key={b._id}><Td className="font-medium">{nameOf(b.caretakerId)}</Td><Td>{b.completedAt ? formatDate(b.completedAt) : "-"}</Td><Td>{formatPaise(b.caretakerGets)}</Td><Td><Button size="sm" loading={pay.isPending && pay.variables?.id === b._id} onClick={async () => { try { await pay.mutateAsync({ id: b._id, force: false }); } catch (e) { if (confirm(`${errorText(e)}\n\nRelease anyway?`)) pay.mutate({ id: b._id, force: true }); } }}>Release payout</Button></Td></tr>)}</tbody></Table>
            ) : <EmptyState icon="💸" title="No payouts waiting" />}
          </Query>
        </Section>
        <Section title="All payments">
          <Query q={payments}>
            {(list) => list.length ? (
              <Table><thead><tr><Th>Date</Th><Th>Type</Th><Th>Amount</Th><Th>Status</Th><Th>Refunded</Th><Th><span className="sr-only">Action</span></Th></tr></thead>
                <tbody>{list.map((p) => { const r = p.refunds.reduce((s, x) => s + x.amount, 0); return (
                  <tr key={p._id}><Td className="whitespace-nowrap">{formatDate(p.createdAt)}</Td><Td className="capitalize">{p.type}</Td><Td>{formatPaise(p.amount)}</Td><Td><Badge tone={p.status === "captured" ? "success" : p.status === "failed" ? "danger" : "neutral"}>{p.status.replace("_", " ")}</Badge></Td><Td>{r ? formatPaise(r) : "–"}</Td>
                    <Td>{p.bookingId && ["captured", "partially_refunded"].includes(p.status) && <Button size="sm" variant="ghost" onClick={() => { const v = prompt("Refund amount in ₹", String((p.amount - r) / 100)); if (v) refund.mutate({ id: p._id, amount: rupeesToPaise(v) }); }}>Refund</Button>}</Td></tr>
                ); })}</tbody></Table>
            ) : <EmptyState icon="💳" title="No payments yet" />}
          </Query>
        </Section>
      </div>
    </>
  );
}

export function Disputes() {
  const [status, setStatus] = useState("open");
  const q = useGet<Dispute[]>(`/admin/disputes?status=${status}`, ["admin", "disputes", status]);
  const [target, setTarget] = useState<Dispute | null>(null);
  const [decision, setDecision] = useState("full_refund");
  const [toOwner, setToOwner] = useState("");
  const [toCaretaker, setToCaretaker] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const resolve = useAction(() => api(`/admin/disputes/${target!._id}/resolve`, { method: "PATCH", body: { decision, note, ...(decision === "partial" ? { amountToOwner: rupeesToPaise(toOwner || 0), amountToCaretaker: rupeesToPaise(toCaretaker || 0) } : {}) } }), { success: "Dispute resolved", invalidate: [["admin"]], onSuccess: () => setTarget(null) });
  return (
    <>
      <PageHeader title="Disputes" description="Read the chat, updates and pet details, then decide." />
      <div className="mb-4 flex gap-2">{["open", "resolved"].map((s) => <button key={s} onClick={() => setStatus(s)} aria-pressed={status === s} className={`rounded-full border px-4 py-1.5 text-sm font-medium capitalize ${status === s ? "border-primary bg-primary-soft text-primary" : "border-border text-muted"}`}>{s}</button>)}</div>
      <Query q={q}>
        {(list) => list.length ? (
          <ul className="space-y-3">{list.map((d) => (
            <li key={d._id}><Card><CardBody className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">Raised by {nameOf(d.raisedBy)} · {formatDate(d.createdAt)}</p><Badge tone={d.status === "open" ? "danger" : "success"}>{d.status}</Badge></div>
              <p className="text-sm">{d.reason}</p>
              {d.bookingId && <p className="text-sm text-muted">Booking total {formatPaise(d.bookingId.ownerPays)} · <Link className="font-medium text-primary underline" href={`/admin/bookings/${d.bookingId._id}`}>Open booking</Link></p>}
              {d.status === "open" ? <Button size="sm" onClick={() => { setTarget(d); setError(""); }}>Decide</Button> : <p className="text-sm text-muted">Decision: {d.adminDecision}</p>}
            </CardBody></Card></li>
          ))}</ul>
        ) : <EmptyState icon="⚖️" title={`No ${status} disputes`} />}
      </Query>
      <Modal open={!!target} onClose={() => setTarget(null)} title="Resolve dispute">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setError(""); resolve.mutate(undefined, { onError: (er) => setError(errorText(er)) }); }}>
          <Field label="Decision" htmlFor="dec"><Select id="dec" value={decision} onChange={(e) => setDecision(e.target.value)}><option value="full_refund">Full refund to owner</option><option value="full_payout">Full payout to caretaker</option><option value="partial">Partial split</option></Select></Field>
          {decision === "partial" && <div className="grid grid-cols-2 gap-3"><Field label="Refund owner (₹)" htmlFor="o"><Input id="o" type="number" min="0" value={toOwner} onChange={(e) => setToOwner(e.target.value)} /></Field><Field label="Pay caretaker (₹)" htmlFor="c"><Input id="c" type="number" min="0" value={toCaretaker} onChange={(e) => setToCaretaker(e.target.value)} /></Field></div>}
          <Field label="Note to both parties" htmlFor="n"><Textarea id="n" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <FormError message={error} />
          <Button type="submit" className="w-full" loading={resolve.isPending}>Record decision</Button>
        </form>
      </Modal>
    </>
  );
}

export function Users() {
  const [search, setSearch] = useState("");
  const q = useGet<(User & { _id: string; isBlocked: boolean })[]>(`/admin/users${search ? `?q=${encodeURIComponent(search)}` : ""}`, ["admin", "users", search]);
  const block = useAction(({ id, blocked }: { id: string; blocked: boolean }) => api(`/admin/users/${id}/block`, { method: "PATCH", body: { blocked } }), { success: "Updated", invalidate: [["admin", "users"]] });
  return (
    <>
      <PageHeader title="Users" description="Search, block or unblock accounts." />
      <Input aria-label="Search users" placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 max-w-sm" />
      <Query q={q}>
        {(list) => (
          <Table><thead><tr><Th>Name</Th><Th>Email</Th><Th>Roles</Th><Th>Status</Th><Th><span className="sr-only">Action</span></Th></tr></thead>
            <tbody>{list.map((u) => <tr key={u._id}><Td className="font-medium">{u.name}</Td><Td>{u.email}</Td><Td><div className="flex flex-wrap gap-1">{u.roles.map((r) => <Badge key={r} tone={r === "admin" ? "danger" : "neutral"}>{r}</Badge>)}</div></Td><Td>{u.isBlocked ? <Badge tone="danger">Blocked</Badge> : <Badge tone="success">Active</Badge>}</Td><Td>{!u.roles.includes("admin") && <Button size="sm" variant={u.isBlocked ? "secondary" : "danger"} onClick={() => block.mutate({ id: u._id, blocked: !u.isBlocked })}>{u.isBlocked ? "Unblock" : "Block"}</Button>}</Td></tr>)}</tbody></Table>
        )}
      </Query>
    </>
  );
}

export function SettingsForm() {
  const q = useGet<Settings>("/admin/settings", ["admin", "settings"]);
  return (
    <>
      <PageHeader title="Settings" description="Fees, refund rules and deadlines apply to new bookings immediately." />
      <Query q={q}>{(s) => <SettingsEditor s={s} />}</Query>
    </>
  );
}

function SettingsEditor({ s }: { s: Settings }) {
  const [rules, setRules] = useState(s.cancellationRules);
  const save = useAction((d: Record<string, unknown>) => api("/admin/settings", { method: "PUT", body: d }), { success: "Settings saved", invalidate: [["admin", "settings"], ["settings"]] });
  return (
    <form className="max-w-2xl space-y-6" onSubmit={(e) => {
      e.preventDefault();
      const d = new FormData(e.currentTarget);
      save.mutate({
        platformFeePercent: Number(d.get("fee")), caretakerCommissionPercent: Number(d.get("commission")), paymentDeadlineHours: Number(d.get("payHours")),
        requestExpiryHours: Number(d.get("reqHours")), disputeWindowHours: Number(d.get("disputeHours")),
        allowedPetTypes: String(d.get("types")).split(",").map((t) => t.trim()).filter(Boolean), cancellationRules: rules,
      });
    }}>
      <Card><CardBody className="grid gap-4 sm:grid-cols-2">
        <Field label="Platform fee (% added to owner)" htmlFor="fee"><Input id="fee" name="fee" type="number" step="0.5" min="0" max="50" defaultValue={s.platformFeePercent} /></Field>
        <Field label="Caretaker commission (%)" htmlFor="commission"><Input id="commission" name="commission" type="number" step="0.5" min="0" max="50" defaultValue={s.caretakerCommissionPercent} /></Field>
        <Field label="Payment deadline (hours)" htmlFor="payHours"><Input id="payHours" name="payHours" type="number" min="1" defaultValue={s.paymentDeadlineHours} /></Field>
        <Field label="Request expiry (hours)" htmlFor="reqHours"><Input id="reqHours" name="reqHours" type="number" min="1" defaultValue={s.requestExpiryHours} /></Field>
        <Field label="Dispute window (hours)" htmlFor="disputeHours"><Input id="disputeHours" name="disputeHours" type="number" min="0" defaultValue={s.disputeWindowHours} /></Field>
        <Field label="Allowed pet types" htmlFor="types" hint="Comma separated"><Input id="types" name="types" defaultValue={s.allowedPetTypes.join(", ")} /></Field>
      </CardBody></Card>
      <Card><CardBody className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Cancellation refund rules</h2><Button size="sm" variant="secondary" onClick={() => setRules([...rules, { hoursBefore: 12, refundPercent: 25 }])}>Add rule</Button></div>
        <p className="text-xs text-muted">Refund % of the care amount when cancelled at least N hours before the start. 100% also refunds the fee. Otherwise no refund.</p>
        {rules.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
            <Field label="Hours before start" htmlFor={`h${i}`}><Input id={`h${i}`} type="number" min="0" value={r.hoursBefore} onChange={(e) => setRules(rules.map((x, j) => (j === i ? { ...x, hoursBefore: Number(e.target.value) } : x)))} /></Field>
            <Field label="Refund %" htmlFor={`p${i}`}><Input id={`p${i}`} type="number" min="0" max="100" value={r.refundPercent} onChange={(e) => setRules(rules.map((x, j) => (j === i ? { ...x, refundPercent: Number(e.target.value) } : x)))} /></Field>
            <Button variant="ghost" aria-label="Remove rule" onClick={() => setRules(rules.filter((_, j) => j !== i))}>✕</Button>
          </div>
        ))}
      </CardBody></Card>
      <Button type="submit" loading={save.isPending}>Save settings</Button>
    </form>
  );
}

export function ShopOrders() {
  const q = useGet<(Order & { userId: { name: string } })[]>("/orders", ["admin", "orders"]);
  const next = { PLACED: "PACKED", PACKED: "SHIPPED", SHIPPED: "DELIVERED" } as Record<string, string>;
  const advance = useAction(({ id, status }: { id: string; status: string }) => api(`/orders/${id}/status`, { method: "PATCH", body: { status } }), { success: "Order updated", invalidate: [["admin", "orders"]] });
  return (
    <>
      <PageHeader title="Shop orders" description="Move orders from placed to delivered." />
      <Query q={q}>
        {(list) => list.length ? (
          <Table><thead><tr><Th>Order</Th><Th>Customer</Th><Th>Items</Th><Th>Total</Th><Th>Status</Th><Th><span className="sr-only">Action</span></Th></tr></thead>
            <tbody>{list.map((o) => <tr key={o._id}><Td>#{o._id.slice(-6)}</Td><Td>{o.userId?.name}</Td><Td>{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</Td><Td>{formatPaise(o.total)}</Td><Td><StatusBadge status={o.status} /></Td><Td>{next[o.status] && <Button size="sm" onClick={() => advance.mutate({ id: o._id, status: next[o.status] })}>Mark {next[o.status].toLowerCase()}</Button>}</Td></tr>)}</tbody></Table>
        ) : <EmptyState icon="📦" title="No orders yet" />}
      </Query>
    </>
  );
}
