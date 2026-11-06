"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, FormError, Input, Select } from "@/components/ui/form";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { calcPricing, countDays, formatPaise } from "@/lib/format";
import { useGet } from "@/lib/hooks";
import type { Booking, Caretaker, Pet } from "@/lib/types";

export function BookingForm({ caretaker }: { caretaker: Caretaker }) {
  const { user } = useAuth();
  const router = useRouter();
  const isOwner = user?.roles.includes("owner");
  const pets = useGet<Pet[]>(isOwner ? "/pets/mine" : null, ["pets"]);
  const settings = useGet<{ platformFeePercent: number }>("/settings/public", ["settings", "public"]);
  const [petId, setPetId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const valid = Boolean(start && end && end >= start);
  const days = valid ? countDays(start, end) : 0;
  const fee = settings.data?.platformFeePercent ?? 10;
  const price = calcPricing(caretaker.pricePerDay, days, fee);
  const list = (pets.data ?? []).filter((p) => !caretaker.acceptedPetTypes.length || caretaker.acceptedPetTypes.includes(p.type));
  const chosen = list.find((p) => p._id === (petId || list[0]?._id));
  const needsVaccine = chosen && chosen.vaccinationDocs.length === 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const b = await api<Booking>("/bookings", { method: "POST", body: { caretakerId: caretaker.id, petId: chosen?._id, startDate: start, endDate: end } });
      router.push(`/owner/bookings/${b._id}`);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <Card className="lg:sticky lg:top-24">
      <CardBody>
        <p className="text-2xl font-semibold">{formatPaise(caretaker.pricePerDay)}<span className="text-base font-normal text-muted"> / day</span></p>
        {!user ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted">Log in to send a booking request.</p>
            <ButtonLink href={`/login?next=/caretakers/${caretaker.id}`} className="w-full">Log in to book</ButtonLink>
          </div>
        ) : !isOwner ? (
          <p className="mt-4 text-sm text-muted">Only pet owners can book. Add the owner role from your account.</p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-4">
            <Field label="Pet" htmlFor="pet">
              {pets.isPending ? <p className="text-sm text-muted">Loading pets…</p> : list.length ? (
                <Select id="pet" value={chosen?._id ?? ""} onChange={(e) => setPetId(e.target.value)}>
                  {list.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.type})</option>)}
                </Select>
              ) : (
                <p className="text-sm text-muted">No matching pets. <Link href="/owner/pets/new" className="font-medium text-primary underline">Add a pet</Link> ({caretaker.acceptedPetTypes.join(", ") || "any type"}).</p>
              )}
            </Field>
            {needsVaccine && <p className="rounded-md bg-warning-50 p-2 text-xs text-warning-700">{chosen.name} needs a vaccination certificate. <Link href={`/owner/pets/${chosen._id}`} className="font-medium underline">Upload it</Link></p>}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start" htmlFor="start"><Input id="start" type="date" min={today} value={start} onChange={(e) => setStart(e.target.value)} required /></Field>
              <Field label="End" htmlFor="end"><Input id="end" type="date" min={start || today} value={end} onChange={(e) => setEnd(e.target.value)} required /></Field>
            </div>
            <dl className="space-y-1.5 rounded-lg bg-surface-muted p-3 text-sm" aria-live="polite">
              <div className="flex justify-between"><dt className="text-muted">{formatPaise(caretaker.pricePerDay)} × {days} {days === 1 ? "day" : "days"}</dt><dd>{formatPaise(price.careAmount)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Platform fee ({fee}%)</dt><dd>{formatPaise(price.platformFee)}</dd></div>
              <div className="flex justify-between border-t border-border pt-1.5 font-semibold"><dt>You pay</dt><dd>{formatPaise(price.ownerPays)}</dd></div>
            </dl>
            <FormError message={error} />
            <Button type="submit" className="w-full" loading={busy} disabled={!valid || !chosen || needsVaccine}>Send request</Button>
            <p className="text-xs text-muted">You pay only after the caretaker accepts. Payment is held until your pet is back.</p>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
