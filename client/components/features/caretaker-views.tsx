"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, StatCard } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Query } from "@/components/ui/feedback";
import { EmptyState, Section, WelcomeBanner } from "@/components/ui/misc";
import { photo } from "@/lib/images";
import { Table, Td, Th } from "@/components/ui/table";
import { api, fileUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatDate, formatPaise, paiseToRupees, rupeesToPaise } from "@/lib/format";
import { useAction, useGet } from "@/lib/hooks";
import { nameOf, type Booking, type CaretakerProfile, type Settings } from "@/lib/types";
import { BookingTable } from "./booking-table";

const PET_TYPES = ["Dog", "Cat", "Rabbit", "Bird", "Other"];

export function VerificationBanner({ p }: { p: CaretakerProfile }) {
  const submit = useAction(() => api("/caretakers/me/submit", { method: "POST" }), { success: "Submitted for verification", invalidate: [["caretaker-profile"]] });
  const map = {
    draft: { tone: "neutral" as const, title: "Complete your profile", text: "Add your details, upload ID and address proof, then submit for verification." },
    pending: { tone: "warning" as const, title: "Under review", text: "Our team is checking your documents. You will be notified." },
    approved: { tone: "success" as const, title: "You are verified", text: "Your profile is visible in search and you can accept bookings." },
    rejected: { tone: "danger" as const, title: "Verification rejected", text: p.rejectionReason ?? "Please upload new documents and resubmit." },
  }[p.verificationStatus];
  return (
    <Card><CardBody className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="flex items-center gap-2"><h2 className="font-semibold">{map.title}</h2><Badge tone={map.tone}>{p.verificationStatus}</Badge></div><p className="mt-1 text-sm text-muted">{map.text}</p></div>
      {(p.verificationStatus === "draft" || p.verificationStatus === "rejected") && <Button loading={submit.isPending} onClick={() => submit.mutate()} disabled={!p.idProofUrl || !p.addressProofUrl || !p.pricePerDay}>Submit for verification</Button>}
    </CardBody></Card>
  );
}

function DocUpload({ kind, label, current }: { kind: "idProof" | "addressProof" | "photos"; label: string; current?: string | string[] }) {
  const [file, setFile] = useState<FileList | null>(null);
  const [n, setN] = useState(0);
  const up = useAction(async () => {
    const form = new FormData();
    [...(file ?? [])].forEach((f) => form.append("files", f));
    return api(`/caretakers/me/documents/${kind}`, { method: "POST", form });
  }, { success: "Uploaded", invalidate: [["caretaker-profile"]], onSuccess: () => { setFile(null); setN((x) => x + 1); } });
  const has = Array.isArray(current) ? current.length > 0 : Boolean(current);
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{label}</p>{has ? <Badge tone="success">Uploaded</Badge> : <Badge tone="warning">Missing</Badge>}</div>
      {typeof current === "string" && current && <a className="mt-1 block text-xs text-primary underline" href={fileUrl(current)} target="_blank" rel="noreferrer">View file</a>}
      <div className="mt-2 flex gap-2"><Input key={n} aria-label={label} type="file" multiple={kind === "photos"} accept={kind === "photos" ? "image/*" : "application/pdf,image/*"} className="py-1.5" onChange={(e) => setFile(e.target.files)} /><Button size="sm" variant="secondary" disabled={!file?.length} loading={up.isPending} onClick={() => up.mutate()}>Upload</Button></div>
    </div>
  );
}

type FormValues = { bio: string; city: string; price: string; maxPets: number; homeType: string; hasGarden: boolean; experienceYears: number; address: string; acceptedPetTypes: string[] };

export function ProfileEditor() {
  const q = useGet<CaretakerProfile>("/caretakers/me/profile", ["caretaker-profile"]);
  return (
    <Query q={q}>
      {(p) => <ProfileForm p={p} />}
    </Query>
  );
}

function ProfileForm({ p }: { p: CaretakerProfile }) {
  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: { bio: p.bio ?? "", city: p.city ?? "", price: p.pricePerDay ? paiseToRupees(p.pricePerDay) : "", maxPets: p.maxPets ?? 1, homeType: p.homeType ?? "", hasGarden: p.hasGarden ?? false, experienceYears: p.experienceYears ?? 0, address: p.address ?? "", acceptedPetTypes: p.acceptedPetTypes ?? [] },
  });
  const save = useAction((v: FormValues) => api("/caretakers/me/profile", { method: "PUT", body: { bio: v.bio, city: v.city, pricePerDay: rupeesToPaise(v.price || 0), maxPets: Number(v.maxPets), homeType: v.homeType, hasGarden: v.hasGarden, experienceYears: Number(v.experienceYears), address: v.address, acceptedPetTypes: v.acceptedPetTypes } }), { success: "Profile saved", invalidate: [["caretaker-profile"]] });
  return (
    <div className="max-w-3xl space-y-6">
      <VerificationBanner p={p} />
      <Card><CardBody>
        <h2 className="mb-4 font-semibold">Your profile</h2>
        <form className="space-y-4" onSubmit={handleSubmit((v) => save.mutate(v))}>
          <Field label="About you" htmlFor="bio"><Textarea id="bio" {...register("bio")} placeholder="Experience, routine, what makes your home great for pets" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City" htmlFor="city"><Input id="city" {...register("city")} /></Field>
            <Field label="Price per day (₹)" htmlFor="price"><Input id="price" type="number" min="1" {...register("price")} /></Field>
            <Field label="Home type" htmlFor="home"><Select id="home" {...register("homeType")}><option value="">Select</option><option>Apartment</option><option>House</option><option>House with garden</option><option>Farm</option></Select></Field>
            <Field label="Max pets at a time" htmlFor="max"><Input id="max" type="number" min="1" max="10" {...register("maxPets")} /></Field>
            <Field label="Years of experience" htmlFor="exp"><Input id="exp" type="number" min="0" {...register("experienceYears")} /></Field>
          </div>
          <fieldset><legend className="mb-2 text-sm font-medium">Pets you accept</legend><div className="flex flex-wrap gap-4">{PET_TYPES.map((t) => <Checkbox key={t} label={t} value={t} {...register("acceptedPetTypes")} />)}</div></fieldset>
          <Checkbox label="My home has a garden" {...register("hasGarden")} />
          <Field label="Full address" htmlFor="addr" hint="Only shown to an owner after their booking is paid"><Textarea id="addr" {...register("address")} /></Field>
          <Button type="submit" loading={save.isPending}>Save profile</Button>
        </form>
      </CardBody></Card>
      <BankCard p={p} />
      <PayoutAccountCard p={p} />
      <Card><CardBody className="space-y-3">
        <h2 className="font-semibold">Documents</h2>
        <p className="text-sm text-muted">ID documents are visible only to our verification team.</p>
        <DocUpload kind="idProof" label="ID proof (Aadhaar, passport, licence)" current={p.idProofUrl} />
        <DocUpload kind="addressProof" label="Address proof" current={p.addressProofUrl} />
        <DocUpload kind="photos" label="Home and pet photos" current={p.photos} />
      </CardBody></Card>
    </div>
  );
}

const PAYOUT_STATUS: Record<string, { tone: "success" | "warning" | "danger" | "neutral"; text: string }> = {
  activated: { tone: "success", text: "Active: payouts are sent automatically" },
  created: { tone: "warning", text: "Under review by Razorpay" },
  needs_clarification: { tone: "warning", text: "Razorpay needs more information" },
  rejected: { tone: "danger", text: "Rejected by Razorpay" },
  none: { tone: "neutral", text: "Not set up" },
};

/** Automatic payouts (Razorpay Route). Shown only when the site runs in route mode. */
function PayoutAccountCard({ p }: { p: CaretakerProfile }) {
  const settings = useGet<Settings>("/settings/public", ["settings", "public"]);
  const [error, setError] = useState("");
  const setup = useAction((v: { pan: string; address: { street: string; city: string; state: string; postalCode: string } }) => api("/caretakers/me/payout-account", { method: "POST", body: v }), { success: "Payout account created", invalidate: [["caretaker-profile"]] });
  if (settings.data?.features?.payoutMode !== "route") return null;
  const status = PAYOUT_STATUS[p.payoutAccountStatus ?? "none"];
  const hasBank = Boolean(p.bankDetails?.accountNumber);
  const editable = !["activated", "created"].includes(p.payoutAccountStatus ?? "none");
  return (
    <Card><CardBody>
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Automatic payouts</h2><Badge tone={status.tone}>{status.text}</Badge></div>
      <p className="mt-1 text-xs text-muted">After each completed stay and the dispute window, your earnings go straight to your bank account. Razorpay verifies your PAN; we do not store it.</p>
      {p.payoutAccountNote && <p className="mt-2 rounded-md bg-warning-50 px-3 py-2 text-xs text-warning-700">{p.payoutAccountNote}</p>}
      {editable && (!hasBank ? <p className="mt-3 text-sm">Save your bank account above first.</p> : (
        <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          const pan = String(d.get("pan")).toUpperCase().trim();
          if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)) return setError("PAN looks wrong. Example: ABCDE1234F");
          setError("");
          setup.mutate({ pan, address: { street: String(d.get("street")), city: String(d.get("city")), state: String(d.get("state")), postalCode: String(d.get("postalCode")) } });
        }}>
          <Field label="PAN" htmlFor="pan" error={error}><Input id="pan" name="pan" required maxLength={10} className="uppercase" autoComplete="off" /></Field>
          <Field label="Street address" htmlFor="street"><Input id="street" name="street" required minLength={3} /></Field>
          <Field label="City" htmlFor="payout-city"><Input id="payout-city" name="city" required /></Field>
          <Field label="State" htmlFor="state"><Input id="state" name="state" required /></Field>
          <Field label="PIN code" htmlFor="postalCode"><Input id="postalCode" name="postalCode" inputMode="numeric" pattern="\d{6}" maxLength={6} required /></Field>
          <div className="flex items-end"><Button type="submit" loading={setup.isPending}>Set up automatic payouts</Button></div>
        </form>
      ))}
    </CardBody></Card>
  );
}

function BankCard({ p }: { p: CaretakerProfile }) {
  const b = p.bankDetails;
  const [error, setError] = useState("");
  const save = useAction((v: { accountName: string; accountNumber: string; ifsc: string }) => api("/caretakers/me/profile", { method: "PUT", body: { bankDetails: v } }), { success: "Bank details saved", invalidate: [["caretaker-profile"]] });
  return (
    <Card><CardBody>
      <h2 className="font-semibold">Payout bank account</h2>
      <p className="mb-4 text-xs text-muted">Your earnings are transferred here after each completed stay. Only our finance team can see this.</p>
      <form className="grid gap-4 sm:grid-cols-3" onSubmit={(e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        const v = { accountName: String(d.get("accountName")), accountNumber: String(d.get("accountNumber")), ifsc: String(d.get("ifsc")).toUpperCase() };
        if (!/^\d{6,20}$/.test(v.accountNumber)) return setError("Account number must be 6 to 20 digits");
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.ifsc)) return setError("IFSC looks wrong. Example: HDFC0001234");
        setError("");
        save.mutate(v);
      }}>
        <Field label="Account holder name" htmlFor="accountName"><Input id="accountName" name="accountName" required defaultValue={b?.accountName ?? ""} /></Field>
        <Field label="Account number" htmlFor="accountNumber"><Input id="accountNumber" name="accountNumber" inputMode="numeric" required defaultValue={b?.accountNumber ?? ""} /></Field>
        <Field label="IFSC code" htmlFor="ifsc" error={error}><Input id="ifsc" name="ifsc" required defaultValue={b?.ifsc ?? ""} className="uppercase" /></Field>
        <div className="sm:col-span-3"><Button type="submit" loading={save.isPending}>Save bank details</Button></div>
      </form>
    </CardBody></Card>
  );
}

export function CaretakerDashboard() {
  const { user } = useAuth();
  const profile = useGet<CaretakerProfile>("/caretakers/me/profile", ["caretaker-profile"]);
  const bookings = useGet<Booking[]>("/caretakers/me/requests", ["bookings", "caretaker"]);
  const earnings = useGet<{ pending: number; paidOut: number; upcoming: number }>("/caretakers/me/earnings", ["earnings"]);
  return (
    <>
      <WelcomeBanner title={`Hello, ${user?.name.split(" ")[0] ?? ""} 👋`} text="Your stays and earnings at a glance." image={photo("runner", 600, 400)} />
      <div className="space-y-8">
        <Query q={profile} skeleton={null}>{(p) => p.verificationStatus !== "approved" ? <VerificationBanner p={p} /> : null}</Query>
        <Query q={bookings}>
          {(list) => {
            const requests = list.filter((b) => b.status === "REQUESTED");
            const active = list.filter((b) => b.status === "IN_CARE");
            return (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard icon="📩" label="Pending requests" value={String(requests.length)} hint="Reply within 24 hours" />
                  <StatCard icon="🐕" label="Active stays" value={String(active.length)} hint={active.length ? "Post today's update" : undefined} />
                  <StatCard icon="⏳" label="Upcoming earnings" value={formatPaise(earnings.data?.upcoming ?? 0)} />
                  <StatCard icon="💰" label="Pending payout" value={formatPaise(earnings.data?.pending ?? 0)} />
                </div>
                <Section title="Needs your reply" action={<Link href="/caretaker/requests" className="text-sm font-medium text-primary hover:underline">View all</Link>}>
                  <BookingTable rows={requests.slice(0, 5)} viewer="caretaker" base="/caretaker/stays" empty={<EmptyState icon="📩" title="No pending requests" />} />
                </Section>
              </>
            );
          }}
        </Query>
      </div>
    </>
  );
}

export function Requests() {
  const q = useGet<Booking[]>("/caretakers/me/requests?status=REQUESTED,ACCEPTED", ["bookings", "caretaker", "requests"]);
  const accept = useAction((id: string) => api(`/bookings/${id}/accept`, { method: "PATCH" }), { success: "Accepted. The owner can now pay.", invalidate: [["bookings"]] });
  const reject = useAction((id: string) => api(`/bookings/${id}/reject`, { method: "PATCH" }), { success: "Declined", invalidate: [["bookings"]] });
  return (
    <Query q={q}>
      {(list) => list.length ? (
        <ul className="space-y-3">
          {list.map((b) => (
            <li key={b._id}><Card><CardBody className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <Link href={`/caretaker/stays/${b._id}`} className="font-semibold hover:underline">{nameOf(b.ownerId)} · {nameOf(b.petId)}</Link>
                <p className="text-sm text-muted">{formatDate(b.startDate)} – {formatDate(b.endDate)} · {b.days} days · you earn {formatPaise(b.caretakerGets)}</p>
              </div>
              {b.status === "REQUESTED" ? (
                <div className="flex gap-2"><Button loading={accept.isPending && accept.variables === b._id} onClick={() => accept.mutate(b._id)}>Accept</Button><Button variant="secondary" loading={reject.isPending && reject.variables === b._id} onClick={() => reject.mutate(b._id)}>Decline</Button></div>
              ) : <Badge tone="info">Waiting for owner to pay</Badge>}
            </CardBody></Card></li>
          ))}
        </ul>
      ) : <EmptyState icon="📩" title="No requests right now" text="New booking requests appear here." />}
    </Query>
  );
}

export function Stays() {
  const q = useGet<Booking[]>("/caretakers/me/requests?status=PAID,IN_CARE,COMPLETED,DISPUTED", ["bookings", "caretaker", "stays"]);
  return <Query q={q}>{(list) => <BookingTable rows={list} viewer="caretaker" base="/caretaker/stays" empty={<EmptyState icon="🐕" title="No stays yet" text="Accepted and paid bookings show up here." />} />}</Query>;
}

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const startOfDay = (v: string | number | Date) => new Date(v).setUTCHours(0, 0, 0, 0);

const STATUS_STYLE: Record<string, { cell: string; dot: string; label: string }> = {
  IN_CARE: { cell: "bg-success-50 text-success-700 border-success-600/30", dot: "bg-success-600", label: "In care" },
  PAID: { cell: "bg-primary-soft text-primary border-primary/30", dot: "bg-primary", label: "Paid" },
  ACCEPTED: { cell: "bg-warning-50 text-warning-700 border-warning-600/30", dot: "bg-warning-600", label: "Awaiting payment" },
  REQUESTED: { cell: "bg-info-50 text-info-700 border-info-600/30", dot: "bg-info-600", label: "Request" },
};

export function Calendar() {
  const q = useGet<Booking[]>("/caretakers/me/requests?status=REQUESTED,ACCEPTED,PAID,IN_CARE", ["bookings", "caretaker", "calendar"]);
  const profile = useGet<CaretakerProfile>("/caretakers/me/profile", ["caretaker-profile"]);
  const blocked = new Set(profile.data?.blockedDates ?? []);
  const [today] = useState(() => iso(Date.now())); // fixed for this visit so renders stay pure
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); });
  const toggle = useAction((day: string) => {
    const next = new Set(blocked);
    if (next.has(day)) next.delete(day); else next.add(day);
    return api("/caretakers/me/profile", { method: "PUT", body: { blockedDates: [...next].filter((d) => d >= today).sort() } });
  }, { invalidate: [["caretaker-profile"]] });

  const year = cursor.getUTCFullYear();
  const month = cursor.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const pad = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const blockedThisMonth = [...blocked].filter((d) => d.startsWith(monthKey)).length;

  return (
    <Query q={q}>
      {(list) => {
        const hitsOn = (ms: number) => list.filter((b) => ms >= startOfDay(b.startDate) && ms <= startOfDay(b.endDate));
        const bookedDays = Array.from({ length: daysInMonth }).filter((_, i) => hitsOn(Date.UTC(year, month, i + 1)).length).length;
        const upcoming = [...list].filter((b) => startOfDay(b.endDate) >= Date.parse(today)).sort((x, y) => +new Date(x.startDate) - +new Date(y.startDate)).slice(0, 5);
        return (
          <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
            <Card><CardBody>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">{cursor.toLocaleString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" })}</h2>
                <div className="flex items-center gap-1.5">
                  <Button variant="secondary" size="sm" onClick={() => { const d = new Date(); setCursor(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))); }}>Today</Button>
                  <Button variant="secondary" size="sm" onClick={() => setCursor(new Date(Date.UTC(year, month - 1, 1)))} aria-label="Previous month">←</Button>
                  <Button variant="secondary" size="sm" onClick={() => setCursor(new Date(Date.UTC(year, month + 1, 1)))} aria-label="Next month">→</Button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted sm:gap-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="pb-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {Array.from({ length: pad }).map((_, i) => <div key={`p${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const ms = Date.UTC(year, month, i + 1);
                  const day = iso(ms);
                  const hits = hitsOn(ms);
                  const isToday = day === today;
                  const past = day < today;
                  const base = "relative flex aspect-square min-h-11 flex-col items-start justify-between rounded-xl border p-1.5 text-left text-sm transition sm:p-2";
                  const number = <span className={cn("inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold", isToday && "bg-primary text-primary-foreground")}>{i + 1}</span>;

                  if (hits.length) {
                    const st = STATUS_STYLE[hits[0].status] ?? STATUS_STYLE.REQUESTED;
                    return (
                      <Link key={i} href={`/caretaker/stays/${hits[0]._id}`} title={hits.map((b) => `${nameOf(b.petId)} · ${st.label}`).join(", ")} className={cn(base, st.cell, "hover:shadow-card", past && "opacity-60")}>
                        {number}
                        <span className="w-full truncate text-[10px] font-medium leading-tight sm:text-xs">{hits.length > 1 ? `${hits.length} pets` : nameOf(hits[0].petId) || "Booked"}</span>
                      </Link>
                    );
                  }
                  const off = blocked.has(day);
                  return (
                    <button key={i} type="button" disabled={past || toggle.isPending || !profile.data} aria-pressed={off} aria-label={`${day}${off ? ", unavailable" : ", available"}`}
                      title={off ? "Unavailable. Tap to open this day" : "Available. Tap to mark unavailable"} onClick={() => toggle.mutate(day)}
                      className={cn(base, "disabled:cursor-default", off ? "border-danger-600/30 bg-danger-50 text-danger-700 hover:bg-danger-50/70" : "border-border bg-surface hover:border-primary/50 hover:bg-primary-soft", past && "opacity-40", isToday && !off && "border-primary/40")}>
                      {number}
                      {off && <span className="text-[10px] font-medium sm:text-xs">Off</span>}
                    </button>
                  );
                })}
              </div>

              <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-4 text-xs text-muted" aria-label="Legend">
                {Object.values(STATUS_STYLE).map((s) => <li key={s.label} className="flex items-center gap-1.5"><span className={cn("size-2.5 rounded-full", s.dot)} aria-hidden />{s.label}</li>)}
                <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-danger-600" aria-hidden />Unavailable</li>
              </ul>
            </CardBody></Card>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-surface p-4"><p className="text-2xl font-semibold">{bookedDays}</p><p className="text-xs text-muted">Booked days this month</p></div>
                <div className="rounded-xl border border-border bg-surface p-4"><p className="text-2xl font-semibold">{blockedThisMonth}</p><p className="text-xs text-muted">Days marked off</p></div>
              </div>

              <Card><CardBody>
                <h3 className="font-semibold">Upcoming</h3>
                {upcoming.length ? (
                  <ul className="mt-3 space-y-3">
                    {upcoming.map((b) => {
                      const st = STATUS_STYLE[b.status] ?? STATUS_STYLE.REQUESTED;
                      return (
                        <li key={b._id}>
                          <Link href={`/caretaker/stays/${b._id}`} className="flex items-start gap-3 rounded-lg p-1 -m-1 hover:bg-surface-muted">
                            <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", st.dot)} aria-hidden />
                            <span className="min-w-0 text-sm"><span className="block truncate font-medium">{nameOf(b.petId) || "Pet"} · {nameOf(b.ownerId)}</span><span className="block text-xs text-muted">{formatDate(b.startDate)} – {formatDate(b.endDate)} · {st.label}</span></span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : <p className="mt-2 text-sm text-muted">No upcoming bookings.</p>}
              </CardBody></Card>

              <div className="rounded-xl bg-primary-soft p-4 text-sm text-primary">
                <p className="font-semibold">Need a day off?</p>
                <p className="mt-1 text-foreground/80">Tap any free future day to mark it unavailable. Owners cannot book those dates. Tap again to open it.</p>
              </div>
            </div>
          </div>
        );
      }}
    </Query>
  );
}

export function Earnings() {
  const q = useGet<{ paidOut: number; pending: number; upcoming: number; bookings: Booking[] }>("/caretakers/me/earnings", ["earnings"]);
  return (
    <Query q={q}>
      {(e) => (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard icon="✅" label="Paid out" value={formatPaise(e.paidOut)} />
            <StatCard icon="⏳" label="Pending payout" value={formatPaise(e.pending)} hint="Released after the dispute window" />
            <StatCard icon="📅" label="Upcoming" value={formatPaise(e.upcoming)} />
          </div>
          {e.bookings.length ? (
            <Table>
              <thead><tr><Th>Pet</Th><Th>Dates</Th><Th>You earn</Th><Th>Payout</Th></tr></thead>
              <tbody>{e.bookings.map((b) => (
                <tr key={b._id}><Td className="font-medium">{nameOf(b.petId) || "Pet"}</Td><Td className="whitespace-nowrap">{formatDate(b.startDate)} – {formatDate(b.endDate)}</Td><Td>{formatPaise(b.caretakerGets)}</Td><Td><Badge tone={b.payoutStatus === "paid" ? "success" : b.payoutStatus === "pending" ? "warning" : "neutral"}>{b.payoutStatus === "none" ? "Not yet" : b.payoutStatus}</Badge></Td></tr>
              ))}</tbody>
            </Table>
          ) : <EmptyState icon="💰" title="No earnings yet" />}
        </div>
      )}
    </Query>
  );
}

export { ButtonLink };
