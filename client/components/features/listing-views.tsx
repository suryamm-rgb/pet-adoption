"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Query, Skeleton } from "@/components/ui/feedback";
import { EmptyState, PageHeader, PetAvatar, emojiFor } from "@/components/ui/misc";
import { Photo } from "@/components/ui/photo";
import { petPhoto } from "@/lib/images";
import { useToast } from "@/components/toast";
import { api, fileUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPaise, petTypeLabel } from "@/lib/format";
import { useAction, useGet } from "@/lib/hooks";
import { payWithRazorpay } from "@/lib/razorpay";
import type { Listing } from "@/lib/types";
import { Chat } from "./chat";
import { ReportButton } from "./report-button";

export function ListingCard({ l }: { l: Listing }) {
  return (
    <Link href={`/listings/${l._id}`} className="group block h-full">
      <Card className="h-full overflow-hidden transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-pop">
        <div className="overflow-hidden"><Photo src={l.photos[0] ? fileUrl(l.photos[0]) : petPhoto(l.petType, l._id, 640, 420)} alt={l.title} fallback={emojiFor(l.petType)} className="h-48 w-full transition duration-500 group-hover:scale-105" /></div>
        <CardBody>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold">{l.title}</h3>
            {l.status === "reserved" && <Badge tone="warning">Reserved</Badge>}
          </div>
          <p className="text-sm text-muted">{[petTypeLabel(l.petType, l.otherPetType), l.city].filter(Boolean).join(" · ")}</p>
          <p className="mt-2 text-lg font-semibold">{l.mode === "adopt" ? <span className="text-primary">Adopt</span> : formatPaise(l.price)}</p>
        </CardBody>
      </Card>
    </Link>
  );
}

export function ListingGrid({ mode }: { mode: "adopt" | "sell" }) {
  const [city, setCity] = useState("");
  const [petType, setPetType] = useState("");
  const qs = new URLSearchParams({ mode, ...(city ? { city } : {}), ...(petType ? { petType } : {}) });
  const q = useGet<Listing[]>(`/listings?${qs}`, ["listings", qs.toString()]);
  return (
    <>
      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_12rem_auto]">
        <Input aria-label="City" placeholder="Filter by city" value={city} onChange={(e) => setCity(e.target.value)} />
        <Select aria-label="Pet type" value={petType} onChange={(e) => setPetType(e.target.value)}><option value="">All pets</option><option>Dog</option><option>Cat</option><option>Rabbit</option><option>Bird</option><option>Other</option></Select>
        <ButtonLink href="/seller/listings/new" variant="secondary">List a pet</ButtonLink>
      </div>
      <Query q={q} skeleton={<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-64" />)}</div>}>
        {(list) => list.length ? <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((l) => <li key={l._id}><ListingCard l={l} /></li>)}</ul> : <EmptyState icon={mode === "adopt" ? "💞" : "🦴"} title="No listings yet" text="Approved listings appear here." />}
      </Query>
    </>
  );
}

export function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const q = useGet<Listing>(`/listings/${id}`, ["listing", id]);
  const [message, setMessage] = useState("");
  const [paying, setPaying] = useState(false);
  const request = useAction(() => api(`/listings/${id}/requests`, { method: "POST", body: { message } }), { success: "Request sent. The lister will reply soon.", invalidate: [["listing", id]] });

  async function buy() {
    if (!user) return router.push(`/login?next=/listings/${id}`);
    setPaying(true);
    try {
      const checkout = await api<Parameters<typeof payWithRazorpay>[0]>(`/payments/sale/${id}`, { method: "POST" });
      if (await payWithRazorpay(checkout, user)) toast("success", "Payment held safely. Confirm once you receive the pet.");
    } catch (e) { toast("error", e instanceof Error ? e.message : "Payment failed"); }
    setPaying(false);
  }

  return (
    <Query q={q}>
      {(l) => (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div>
            {l.photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fileUrl(l.photos[0])} alt={l.title} className="aspect-[4/3] w-full rounded-2xl object-cover" />
            ) : <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-accent-50 text-8xl" aria-hidden>🐾</div>}
            <h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">{l.title}</h1>
            <p className="text-muted">{[petTypeLabel(l.petType, l.otherPetType), l.city].filter(Boolean).join(" · ")}</p>
            <p className="mt-4 whitespace-pre-line">{l.description}</p>
            <div className="mt-3"><ReportButton targetType="listing" targetId={l._id} label="Report this listing" /></div>
          </div>
          <div className="space-y-4">
            <Card>
              <CardBody className="space-y-4">
                <p className="text-2xl font-semibold">{l.mode === "adopt" ? "Free to adopt" : formatPaise(l.price)}</p>
                {l.status === "reserved" && <Badge tone="warning">Reserved</Badge>}
                {!user ? <ButtonLink href={`/login?next=/listings/${id}`} className="w-full">Log in to continue</ButtonLink>
                  : l.sellerId === user.id ? <p className="text-sm text-muted">This is your listing.</p>
                  : l.mode === "adopt" ? (
                    <form onSubmit={(e) => { e.preventDefault(); request.mutate(); }} className="space-y-3">
                      <Field label="Tell the lister about your home" htmlFor="msg"><Textarea id="msg" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Other pets, family, experience…" /></Field>
                      <Button type="submit" className="w-full" loading={request.isPending}>Request adoption</Button>
                    </form>
                  ) : <Button className="w-full" variant="accent" loading={paying} disabled={l.status !== "approved"} onClick={buy}>Buy securely</Button>}
                <p className="text-xs text-muted">{l.mode === "sell" ? "Payment is held by PawStay until you confirm handover." : "Adoption requests are reviewed by the lister."}</p>
              </CardBody>
            </Card>
            {user && l.sellerId !== user.id && <Chat listingId={l._id} title="Message the lister" />}
          </div>
        </div>
      )}
    </Query>
  );
}

export function NewListingForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"adopt" | "sell">("adopt");
  const [isOther, setIsOther] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const create = useAction(async (data: Record<string, unknown>) => {
    const l = await api<Listing>("/listings", { method: "POST", body: data });
    if (files?.length) { const form = new FormData(); [...files].forEach((f) => form.append("files", f)); await api(`/listings/${l._id}/photos`, { method: "POST", form }); }
    return l;
  }, { success: "Submitted for admin approval", onSuccess: () => router.push("/seller") });

  return (
    <>
      <PageHeader title="New listing" description="Listings go live after admin approval." />
      <Card className="max-w-2xl"><CardBody>
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          create.mutate({ title: d.get("title"), mode, petType: d.get("petType"), otherPetType: d.get("petType") === "Other" ? d.get("otherPetType") : undefined, city: d.get("city"), description: d.get("description"), price: mode === "sell" ? Math.round(Number(d.get("price")) * 100) : 0 });
        }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Listing type" htmlFor="mode"><Select id="mode" value={mode} onChange={(e) => setMode(e.target.value as "adopt" | "sell")}><option value="adopt">Adoption (free)</option><option value="sell">Sale</option></Select></Field>
            <Field label="Pet type" htmlFor="petType"><Select id="petType" name="petType" onChange={(e) => setIsOther(e.target.value === "Other")}><option>Dog</option><option>Cat</option><option>Rabbit</option><option>Bird</option><option>Other</option></Select></Field>
          </div>
          {isOther && <Field label="Specify pet type" htmlFor="otherPetType"><Input id="otherPetType" name="otherPetType" required maxLength={40} placeholder="Hamster, turtle, guinea pig…" /></Field>}
          <Field label="Title" htmlFor="title"><Input id="title" name="title" required minLength={3} placeholder="Friendly 2-year-old Beagle" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City" htmlFor="city"><Input id="city" name="city" required /></Field>
            {mode === "sell" && <Field label="Price (₹)" htmlFor="price"><Input id="price" name="price" type="number" min="1" required /></Field>}
          </div>
          <Field label="Description" htmlFor="description"><Textarea id="description" name="description" /></Field>
          <Field label="Photos" htmlFor="photos" hint="JPG, PNG or WEBP, up to 5 MB each"><Input id="photos" type="file" accept="image/*" multiple className="py-1.5" onChange={(e) => setFiles(e.target.files)} /></Field>
          <Button type="submit" loading={create.isPending}>Submit listing</Button>
        </form>
      </CardBody></Card>
    </>
  );
}

export { PetAvatar };
