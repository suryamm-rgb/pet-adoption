"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { FormError, Input, Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/toast";
import { api, errorText } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useAction, useGet } from "@/lib/hooks";
import type { BookingStatus, CheckIn } from "@/lib/types";

const KIND: Record<CheckIn["kind"], { icon: string; label: string }> = {
  walk: { icon: "🦮", label: "Walk" },
  vet: { icon: "🩺", label: "Vet visit" },
  home: { icon: "🏠", label: "Back home" },
  other: { icon: "📍", label: "Location" },
};

/** OpenStreetMap embed: free, no account or API key. */
const mapSrc = (c: CheckIn) => `https://www.openstreetmap.org/export/embed.html?bbox=${c.lng - 0.006}%2C${c.lat - 0.004}%2C${c.lng + 0.006}%2C${c.lat + 0.004}&layer=mapnik&marker=${c.lat}%2C${c.lng}`;
const mapLink = (c: CheckIn) => `https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lng}#map=17/${c.lat}/${c.lng}`;

function ShareLocation({ bookingId }: { bookingId: string }) {
  const toast = useToast();
  const [kind, setKind] = useState<CheckIn["kind"]>("walk");
  const [note, setNote] = useState("");
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const post = useAction((p: { lat: number; lng: number; accuracy?: number }) => api(`/bookings/${bookingId}/checkins`, { method: "POST", body: { kind, note: note || undefined, ...p } }),
    { invalidate: [["booking", bookingId, "checkins"]], onSuccess: () => { setNote(""); toast("success", "Location shared with the owner"); } });

  function share() {
    setError("");
    if (!("geolocation" in navigator)) return setError("This device cannot share its location");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocating(false); post.mutate({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) }, { onError: (e) => setError(errorText(e)) }); },
      (err) => { setLocating(false); setError(err.code === err.PERMISSION_DENIED ? "Location is blocked. Allow it in your browser's site settings and try again" : "Could not get your location. Try again outdoors"); },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }
  return (
    <div className="rounded-lg bg-surface-muted p-3">
      <p className="text-sm font-medium">Share where you are</p>
      <p className="mb-3 text-xs text-muted">Only when you tap the button. We never track you in the background.</p>
      <div className="grid gap-2 sm:grid-cols-[10rem_1fr_auto]">
        <Select aria-label="What are you doing" value={kind} onChange={(e) => setKind(e.target.value as CheckIn["kind"])}>
          {Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
        </Select>
        <Input aria-label="Note for the owner" placeholder="Optional note, e.g. Playing fetch" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
        <Button onClick={share} loading={locating || post.isPending}>Share location</Button>
      </div>
      <div className="mt-2"><FormError message={error} /></div>
    </div>
  );
}

export function CheckInPanel({ bookingId, role, status }: { bookingId: string; role: "owner" | "caretaker" | "admin"; status: BookingStatus }) {
  const live = status === "IN_CARE";
  const q = useGet<CheckIn[]>(`/bookings/${bookingId}/checkins`, ["booking", bookingId, "checkins"], { refetchInterval: live ? 30_000 : undefined });
  const list = q.data ?? [];
  const canShare = role === "caretaker" && live;
  if (!canShare && !list.length && !live) return null;
  const latest = list[0];
  return (
    <Card><CardBody className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Locations</h2>
        {latest && <span className="text-xs text-muted">Last update {formatDateTime(latest.createdAt)}</span>}
      </div>
      {canShare && <ShareLocation bookingId={bookingId} />}
      {latest ? (
        <>
          <div className="overflow-hidden rounded-xl border border-border">
            <iframe key={latest._id} title={`Map: ${KIND[latest.kind].label}`} src={mapSrc(latest)} className="h-56 w-full" loading="lazy" referrerPolicy="no-referrer" />
          </div>
          <a href={mapLink(latest)} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline">Open a larger map ↗</a>
          <ul className="space-y-2 border-t border-border pt-3">
            {list.slice(0, 8).map((c) => (
              <li key={c._id} className="flex items-start gap-3 text-sm">
                <span aria-hidden className="text-lg">{KIND[c.kind].icon}</span>
                <div className="min-w-0 flex-1">
                  <p><span className="font-medium">{KIND[c.kind].label}</span>{c.note ? <span className="text-muted"> · {c.note}</span> : null}</p>
                  <p className="text-xs text-muted">{formatDateTime(c.createdAt)}{c.accuracy ? ` · accurate to about ${c.accuracy} m` : ""}</p>
                </div>
                <a href={mapLink(c)} target="_blank" rel="noreferrer" className="shrink-0 text-xs text-primary hover:underline">Map</a>
              </li>
            ))}
          </ul>
        </>
      ) : <EmptyState icon="📍" title="No locations shared yet" text={role === "owner" ? "The caretaker can share a location during walks or vet visits. You will be notified." : "Share a location during a walk so the owner can relax."} />}
    </CardBody></Card>
  );
}
