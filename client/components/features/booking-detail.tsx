"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Modal, Query, StarInput } from "@/components/ui/feedback";
import { Avatar, EmptyState, PageHeader, Stat } from "@/components/ui/misc";
import { useToast } from "@/components/toast";
import { API_URL, api, fileUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { estimateRefund, formatDate, formatDateTime, formatPaise } from "@/lib/format";
import { useAction, useGet } from "@/lib/hooks";
import { payWithRazorpay } from "@/lib/razorpay";
import type { Booking, DailyUpdate, Review, Settings } from "@/lib/types";
import { idOf, nameOf } from "@/lib/types";
import { Chat } from "./chat";
import { CheckInPanel } from "./checkins";

const STEPS = ["REQUESTED", "ACCEPTED", "PAID", "IN_CARE", "COMPLETED"] as const;
const label = (s: string) => s.replace("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());

type Event = { at: string; icon: string; text: string };

/** One running story of the stay: status changes, instructions and every daily update, newest first. */
function ActivityFeed({ b, updates }: { b: Booking; updates: DailyUpdate[] }) {
  const events: Event[] = [
    { at: b.createdAt, icon: "📨", text: "Booking requested" },
    ...(b.acceptedAt ? [{ at: b.acceptedAt, icon: "✅", text: "Caretaker accepted" }] : []),
    ...b.instructions.map((i) => ({ at: i.at, icon: "📝", text: `Instruction: ${i.text}${i.acknowledged ? " (read)" : ""}` })),
    ...updates.map((u) => ({ at: u.createdAt, icon: u.photos.length ? "📸" : "💬", text: u.note || "Photo update" })),
    ...(b.completedAt ? [{ at: b.completedAt, icon: "🏁", text: "Stay completed" }] : []),
  ].sort((x, y) => +new Date(y.at) - +new Date(x.at));
  return (
    <Card><CardBody>
      <h2 className="font-semibold">Activity</h2>
      <ol className="mt-3 space-y-3 border-l-2 border-border pl-4">
        {events.map((e, i) => (
          <li key={i} className="relative text-sm">
            <span aria-hidden className="absolute -left-[1.6rem] top-0 flex size-5 items-center justify-center rounded-full bg-surface text-xs">{e.icon}</span>
            <p className="line-clamp-2">{e.text}</p>
            <p className="text-xs text-muted">{formatDateTime(e.at)}</p>
          </li>
        ))}
      </ol>
    </CardBody></Card>
  );
}

function Timeline({ status }: { status: string }) {
  const idx = STEPS.indexOf(status as (typeof STEPS)[number]);
  if (idx < 0) return <p className="text-sm text-muted">This booking ended as <StatusBadge status={status} /></p>;
  return (
    <ol className="flex items-center gap-1 overflow-x-auto pb-1" aria-label="Booking progress">
      {STEPS.map((s, i) => (
        <li key={s} className="flex flex-1 items-center gap-1" aria-current={i === idx ? "step" : undefined}>
          <div className="flex min-w-16 flex-col items-center gap-1 text-center">
            <span className={cn("flex size-7 items-center justify-center rounded-full text-xs font-semibold", i <= idx ? "bg-primary text-primary-foreground" : "bg-surface-muted text-muted")}>{i < idx ? "✓" : i + 1}</span>
            <span className={cn("text-[11px] leading-tight", i === idx ? "font-semibold" : "text-muted")}>{label(s)}</span>
          </div>
          {i < STEPS.length - 1 && <span className={cn("mb-5 h-0.5 min-w-3 flex-1", i < idx ? "bg-primary" : "bg-border")} />}
        </li>
      ))}
    </ol>
  );
}

export function BookingDetail({ role }: { role: "owner" | "caretaker" | "admin" }) {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const key = ["booking", id];
  const q = useGet<Booking>(`/bookings/${id}`, key, { refetchInterval: 30_000 });
  const settings = useGet<Settings & { disputeWindowHours: number }>("/settings/public", ["settings", "public"]);
  const updates = useGet<DailyUpdate[]>(`/bookings/${id}/updates`, ["booking", id, "updates"]);
  const myReviews = useGet<{ given: Review[] }>("/bookings/reviews/mine", ["reviews", "mine"]);
  const [modal, setModal] = useState<"cancel" | "dispute" | "review" | null>(null);
  const [paying, setPaying] = useState(false);
  const [now] = useState(() => Date.now());
  const refresh = { invalidate: [key, ["bookings"]] };

  const accept = useAction(() => api(`/bookings/${id}/accept`, { method: "PATCH" }), { ...refresh, success: "Booking accepted. The owner can now pay." });
  const reject = useAction(() => api(`/bookings/${id}/reject`, { method: "PATCH" }), { ...refresh, success: "Booking declined" });
  const complete = useAction(() => api(`/bookings/${id}/complete`, { method: "PATCH" }), { ...refresh, success: "Marked as received. Thank you!", onSuccess: () => setModal("review") });
  const emergency = useAction(() => api(`/bookings/${id}/emergency`, { method: "POST" }), { success: "Owner and admin have been alerted" });
  const ack = useAction((iid: string) => api(`/bookings/${id}/instructions/${iid}/ack`, { method: "PATCH" }), refresh);

  async function pay(b: Booking) {
    if (!user) return;
    setPaying(true);
    try {
      const checkout = await api<Parameters<typeof payWithRazorpay>[0]>("/payments/order", { method: "POST", body: { bookingId: b._id } });
      if (await payWithRazorpay(checkout, user)) toast("success", "Payment received. Your booking is confirmed.");
    } catch (e) { toast("error", e instanceof Error ? e.message : "Payment failed"); }
    setPaying(false);
    q.refetch();
  }

  return (
    <Query q={q}>
      {(b) => {
        const petName = b.petSnapshot?.name ?? nameOf(b.petId);
        const owner = typeof b.ownerId === "string" ? undefined : b.ownerId;
        const caretaker = typeof b.caretakerId === "string" ? undefined : b.caretakerId;
        const other = role === "owner" ? caretaker : owner;
        const hasReviewed = myReviews.data?.given.some((r) => r.bookingId === b._id);
        const inWindow = b.status === "COMPLETED" && b.payoutStatus !== "paid" && b.completedAt && now - new Date(b.completedAt).getTime() < (settings.data?.disputeWindowHours ?? 24) * 3_600_000;
        const canDispute = role !== "admin" && (b.status === "IN_CARE" || inWindow);
        const canCancel = role !== "admin" && ["REQUESTED", "ACCEPTED", "PAID"].includes(b.status) && !(role === "caretaker" && b.status === "REQUESTED");
        const refund = settings.data ? estimateRefund(b, settings.data.cancellationRules, role === "caretaker", now) : 0;
        const snap = b.petSnapshot;

        return (
          <>
            <PageHeader title={`${petName} · ${formatDate(b.startDate)} – ${formatDate(b.endDate)}`} description={`${b.days} ${b.days === 1 ? "day" : "days"} with ${role === "admin" ? `${nameOf(b.caretakerId)} (owner: ${nameOf(b.ownerId)})` : nameOf(other ?? "")}`} action={<StatusBadge status={b.status} />} />
            <Card className="mb-6"><CardBody><Timeline status={b.status} /></CardBody></Card>

            <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
              <div className="space-y-6">
                {role === "caretaker" && b.status === "IN_CARE" && <PostUpdate bookingId={b._id} />}
                <CheckInPanel bookingId={b._id} role={role} status={b.status} />

                <Card><CardBody>
                  <h2 className="font-semibold">Daily updates</h2>
                  <Query q={updates} skeleton={<p className="mt-3 text-sm text-muted">Loading…</p>}>
                    {(list) => list.length ? (
                      <ul className="mt-4 space-y-5">
                        {list.map((u) => (
                          <li key={u._id} className="border-l-2 border-primary pl-4">
                            <p className="text-xs text-muted">{formatDateTime(u.createdAt)}</p>
                            <p className="mt-0.5 text-sm">{u.note}</p>
                            {!!u.photos.length && <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{u.photos.map((p) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <a key={p} href={fileUrl(p)} target="_blank" rel="noreferrer"><img src={fileUrl(p)} alt="Update photo" className="aspect-square w-full rounded-lg object-cover" /></a>
                            ))}</div>}
                          </li>
                        ))}
                      </ul>
                    ) : <div className="mt-3"><EmptyState icon="📸" title="No updates yet" text={b.status === "IN_CARE" ? "The caretaker posts a photo and note each day." : "Updates appear once the stay starts."} /></div>}
                  </Query>
                </CardBody></Card>

                <Card><CardBody>
                  <div className="flex items-center justify-between"><h2 className="font-semibold">Instructions</h2>{role === "owner" && ["PAID", "IN_CARE"].includes(b.status) && <AddInstruction bookingId={b._id} />}</div>
                  {b.instructions.length ? (
                    <ul className="mt-3 space-y-2">
                      {b.instructions.map((i) => (
                        <li key={i._id} className="flex items-start justify-between gap-3 rounded-lg bg-surface-muted p-3 text-sm">
                          <div><p>{i.text}</p><p className="mt-0.5 text-xs text-muted">{formatDateTime(i.at)}</p></div>
                          {i.acknowledged ? <Badge tone="success">Read</Badge> : role === "caretaker" ? <Button size="sm" onClick={() => ack.mutate(i._id)}>I have read this</Button> : <Badge tone="warning">Not read yet</Badge>}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="mt-2 text-sm text-muted">No extra instructions.</p>}
                </CardBody></Card>

                {["ACCEPTED", "PAID", "IN_CARE", "COMPLETED", "DISPUTED"].includes(b.status) && <Chat bookingId={b._id} readOnly={role === "admin"} title={role === "admin" ? "Chat (read only)" : "Chat"} />}
              </div>

              <div className="space-y-6">
                <ActivityFeed b={b} updates={updates.data ?? []} />
                <Card><CardBody className="space-y-4">
                  <h2 className="font-semibold">Payment</h2>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between"><dt className="text-muted">{formatPaise(b.pricePerDay)} × {b.days}</dt><dd>{formatPaise(b.careAmount)}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted">Platform fee</dt><dd>{formatPaise(b.platformFee)}</dd></div>
                    <div className="flex justify-between border-t border-border pt-2 font-semibold"><dt>{role === "caretaker" ? "You earn" : "Total"}</dt><dd>{formatPaise(role === "caretaker" ? b.caretakerGets : b.ownerPays)}</dd></div>
                    {b.refundAmount > 0 && <div className="flex justify-between text-info-700"><dt>Refunded</dt><dd>{formatPaise(b.refundAmount)}</dd></div>}
                  </dl>
                  {role === "owner" && b.status === "ACCEPTED" && <Button className="w-full" loading={paying} onClick={() => pay(b)}>Pay {formatPaise(b.ownerPays)}</Button>}
                  {role === "caretaker" && b.status === "REQUESTED" && (
                    <div className="grid grid-cols-2 gap-2"><Button loading={accept.isPending} onClick={() => accept.mutate()}>Accept</Button><Button variant="secondary" loading={reject.isPending} onClick={() => reject.mutate()}>Decline</Button></div>
                  )}
                  {role === "owner" && b.status === "IN_CARE" && <Button className="w-full" variant="accent" loading={complete.isPending} onClick={() => confirm("Confirm that your pet is back safely?") && complete.mutate()}>Pet received safely</Button>}
                  {role === "owner" && b.status === "COMPLETED" && !hasReviewed && <Button className="w-full" onClick={() => setModal("review")}>Leave a review</Button>}
                  {role === "caretaker" && b.status === "COMPLETED" && !hasReviewed && <Button className="w-full" variant="secondary" onClick={() => setModal("review")}>Review the owner</Button>}
                  {role === "caretaker" && b.status === "IN_CARE" && <Button className="w-full" variant="danger" loading={emergency.isPending} onClick={() => confirm("Alert the owner and admin about an emergency?") && emergency.mutate()}>🚨 Emergency</Button>}
                  {canDispute && <Button className="w-full" variant="secondary" onClick={() => setModal("dispute")}>Raise a dispute</Button>}
                  {canCancel && <Button className="w-full" variant="ghost" onClick={() => setModal("cancel")}>Cancel booking</Button>}
                  {role !== "caretaker" && ["PAID", "IN_CARE", "COMPLETED", "REFUNDED", "CANCELLED"].includes(b.status) && b.ownerPays > 0 && b.status !== "CANCELLED" && <a className="block text-center text-sm font-medium text-primary hover:underline" href={`${API_URL}/bookings/${b._id}/invoice`} target="_blank" rel="noreferrer">Download invoice (PDF)</a>}
                  {b.status === "DISPUTED" && <p className="rounded-md bg-warning-50 p-3 text-sm text-warning-700">A dispute is open. Payout is frozen until an admin decides.</p>}
                  {b.payoutStatus !== "none" && role !== "owner" && <p className="text-xs text-muted">Payout: {b.payoutStatus}</p>}
                </CardBody></Card>

                <Card><CardBody>
                  <h2 className="font-semibold">Pet details</h2>
                  <div className="mt-3 flex items-center gap-3"><Avatar name={petName} className="size-12" /><div><p className="font-medium">{petName}</p><p className="text-sm text-muted">{[snap?.type, snap?.breed, snap?.age].filter(Boolean).join(" · ")}</p></div></div>
                  {snap ? (
                    <dl className="mt-4 grid grid-cols-2 gap-3">
                      <Stat label="Allergies" value={snap.allergies || "None noted"} />
                      <Stat label="Food" value={[snap.food?.type, snap.food?.schedule].filter(Boolean).join(", ") || "-"} />
                      <Stat label="Vet" value={[snap.vetName, snap.vetPhone].filter(Boolean).join(" · ") || "-"} />
                      <Stat label="Owner contact" value={[snap.emergencyContact?.name, snap.emergencyContact?.phone].filter(Boolean).join(" · ") || "-"} />
                    </dl>
                  ) : <p className="mt-3 text-sm text-muted">Full details are shared once the booking is accepted.</p>}
                </CardBody></Card>

                {(other?.phone || b.caretakerAddress) && (
                  <Card><CardBody className="space-y-1 text-sm">
                    <h2 className="font-semibold">Contact</h2>
                    {other?.phone && <p>📞 <a className="text-primary underline" href={`tel:${other.phone}`}>{other.phone}</a></p>}
                    {role === "owner" && b.caretakerAddress && <p>📍 {b.caretakerAddress}</p>}
                  </CardBody></Card>
                )}
                {role === "owner" && caretaker && <Link href={`/caretakers/${idOf(caretaker)}`} className="block text-center text-sm font-medium text-primary hover:underline">View caretaker profile</Link>}
              </div>
            </div>

            <CancelModal open={modal === "cancel"} onClose={() => setModal(null)} bookingId={b._id} refund={b.status === "PAID" ? refund : null} />
            <DisputeModal open={modal === "dispute"} onClose={() => setModal(null)} bookingId={b._id} />
            <ReviewModal open={modal === "review"} onClose={() => setModal(null)} bookingId={b._id} />
          </>
        );
      }}
    </Query>
  );
}

function PostUpdate({ bookingId }: { bookingId: string }) {
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [input, setInput] = useState(0);
  const post = useAction(async () => {
    const form = new FormData();
    form.append("note", note);
    [...(files ?? [])].forEach((f) => form.append("files", f));
    return api(`/bookings/${bookingId}/updates`, { method: "POST", form });
  }, { success: "Update posted", invalidate: [["booking", bookingId, "updates"]], onSuccess: () => { setNote(""); setFiles(null); setInput((n) => n + 1); } });
  return (
    <Card><CardBody>
      <h2 className="font-semibold">Post today&apos;s update</h2>
      <form className="mt-3 space-y-3" onSubmit={(e) => { e.preventDefault(); post.mutate(); }}>
        <Textarea aria-label="Update note" placeholder="How is the pet doing today?" value={note} onChange={(e) => setNote(e.target.value)} required />
        <Input key={input} aria-label="Photos" type="file" accept="image/*" multiple className="py-1.5" onChange={(e) => setFiles(e.target.files)} />
        <Button type="submit" loading={post.isPending} disabled={!note.trim()}>Post update</Button>
      </form>
    </CardBody></Card>
  );
}

function AddInstruction({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const add = useAction(() => api(`/bookings/${bookingId}/instructions`, { method: "POST", body: { text } }), { success: "Caretaker notified", invalidate: [["booking", bookingId]], onSuccess: () => { setText(""); setOpen(false); } });
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>Add instruction</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="New instruction">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
          <Field label="What should the caretaker know?" htmlFor="instr"><Textarea id="instr" value={text} onChange={(e) => setText(e.target.value)} required maxLength={500} /></Field>
          <Button type="submit" className="w-full" loading={add.isPending} disabled={!text.trim()}>Send</Button>
        </form>
      </Modal>
    </>
  );
}

function CancelModal({ open, onClose, bookingId, refund }: { open: boolean; onClose: () => void; bookingId: string; refund: number | null }) {
  const [reason, setReason] = useState("");
  const cancel = useAction(() => api(`/bookings/${bookingId}/cancel`, { method: "PATCH", body: { reason } }), { success: "Booking cancelled", invalidate: [["booking", bookingId], ["bookings"]], onSuccess: onClose });
  return (
    <Modal open={open} onClose={onClose} title="Cancel this booking?">
      <div className="space-y-3">
        {refund !== null && <p className="rounded-md bg-surface-muted p-3 text-sm">Based on the refund policy you will get back <strong>{formatPaise(refund)}</strong>.</p>}
        <Field label="Reason (optional)" htmlFor="reason"><Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-2"><Button variant="secondary" onClick={onClose}>Keep booking</Button><Button variant="danger" loading={cancel.isPending} onClick={() => cancel.mutate()}>Cancel booking</Button></div>
      </div>
    </Modal>
  );
}

function DisputeModal({ open, onClose, bookingId }: { open: boolean; onClose: () => void; bookingId: string }) {
  const [reason, setReason] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const raise = useAction(async () => {
    const form = new FormData();
    form.append("reason", reason);
    [...(files ?? [])].forEach((f) => form.append("files", f));
    return api(`/bookings/${bookingId}/disputes`, { method: "POST", form });
  }, { success: "Dispute raised. An admin will review it.", invalidate: [["booking", bookingId], ["bookings"]], onSuccess: onClose });
  return (
    <Modal open={open} onClose={onClose} title="Raise a dispute">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); raise.mutate(); }}>
        <p className="text-sm text-muted">Payout is frozen while an admin reviews the chat, updates and pet details.</p>
        <Field label="What went wrong?" htmlFor="why" hint="At least 5 characters"><Textarea id="why" value={reason} onChange={(e) => setReason(e.target.value)} required /></Field>
        <Field label="Photos (optional)" htmlFor="ev"><Input id="ev" type="file" accept="image/*" multiple className="py-1.5" onChange={(e) => setFiles(e.target.files)} /></Field>
        <Button type="submit" className="w-full" variant="danger" loading={raise.isPending} disabled={reason.trim().length < 5}>Submit dispute</Button>
      </form>
    </Modal>
  );
}

function ReviewModal({ open, onClose, bookingId }: { open: boolean; onClose: () => void; bookingId: string }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const send = useAction(() => api(`/bookings/${bookingId}/reviews`, { method: "POST", body: { rating, comment } }), { success: "Thanks for your review", invalidate: [["reviews"]], onSuccess: onClose });
  return (
    <Modal open={open} onClose={onClose} title="How was the stay?">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); send.mutate(); }}>
        <StarInput value={rating} onChange={setRating} />
        <Field label="Comment" htmlFor="comment"><Textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
        <Button type="submit" className="w-full" loading={send.isPending}>Submit review</Button>
      </form>
    </Modal>
  );
}
