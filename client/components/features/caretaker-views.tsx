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
import { nameOf, type Booking, type CaretakerProfile } from "@/lib/types";
import { BookingTable } from "./booking-table";

const PET_TYPES = ["Dog", "Cat", "Rabbit", "Bird"];

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

const DAY = 86_400_000;
export function Calendar() {
  const q = useGet<Booking[]>("/caretakers/me/requests?status=REQUESTED,ACCEPTED,PAID,IN_CARE", ["bookings", "caretaker", "calendar"]);
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); });
  const year = cursor.getUTCFullYear();
  const month = cursor.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const pad = first.getUTCDay();
  return (
    <Query q={q}>
      {(list) => (
        <Card><CardBody>
          <div className="mb-4 flex items-center justify-between">
            <Button variant="secondary" size="sm" onClick={() => setCursor(new Date(Date.UTC(year, month - 1, 1)))} aria-label="Previous month">←</Button>
            <h2 className="font-semibold">{cursor.toLocaleString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" })}</h2>
            <Button variant="secondary" size="sm" onClick={() => setCursor(new Date(Date.UTC(year, month + 1, 1)))} aria-label="Next month">→</Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">{["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} className="py-1">{d}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: pad }).map((_, i) => <div key={`p${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const t = Date.UTC(year, month, i + 1);
              const hits = list.filter((b) => t >= new Date(b.startDate).setUTCHours(0, 0, 0, 0) && t < new Date(b.endDate).setUTCHours(0, 0, 0, 0) + DAY);
              const status = hits[0]?.status;
              return (
                <div key={i} title={hits.map((b) => `${nameOf(b.petId)} (${b.status})`).join(", ")} className={cn("flex aspect-square flex-col items-center justify-center rounded-lg border text-sm", !hits.length ? "border-border" : status === "IN_CARE" ? "border-success-600/40 bg-success-50 text-success-700" : status === "PAID" ? "border-primary/40 bg-primary-soft text-primary" : "border-warning-600/40 bg-warning-50 text-warning-700")}>
                  <span>{i + 1}</span>{hits.length > 0 && <span className="text-[10px]" aria-hidden>{hits.length > 1 ? `${hits.length} pets` : "booked"}</span>}
                </div>
              );
            })}
          </div>
          <p className="mt-4 flex flex-wrap gap-4 text-xs text-muted"><span>🟩 In care</span><span>🟦 Paid</span><span>🟨 Requested / awaiting payment</span></p>
        </CardBody></Card>
      )}
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
