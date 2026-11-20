"use client";

import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { Query } from "@/components/ui/feedback";
import { Avatar, EmptyState, Rating, Stat, emojiFor } from "@/components/ui/misc";
import { Photo } from "@/components/ui/photo";
import { fileUrl } from "@/lib/api";
import { petPhoto } from "@/lib/images";
import { formatDate, formatPaise } from "@/lib/format";
import { useGet } from "@/lib/hooks";
import { nameOf, type Caretaker, type Review } from "@/lib/types";
import { BookingForm } from "./booking-form";
import { ReportButton } from "./report-button";

export function CaretakerDetail() {
  const { id } = useParams<{ id: string }>();
  const q = useGet<Caretaker>(`/caretakers/${id}`, ["caretaker", id]);
  const reviews = useGet<Review[]>(`/caretakers/${id}/reviews`, ["caretaker", id, "reviews"]);

  return (
    <Query q={q}>
      {(c) => (
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-6">
            <Photo src={c.photos?.[0] ? fileUrl(c.photos[0]) : petPhoto(c.acceptedPetTypes[0], c.id, 1200, 520)} alt="" fallback={emojiFor(c.acceptedPetTypes[0])} className="h-44 w-full rounded-2xl sm:h-64" />
            <div className="-mt-14 flex flex-col gap-4 px-2 sm:-mt-16 sm:flex-row sm:items-end sm:px-5">
              <Avatar name={c.name} src={c.photos?.[0]} className="size-24 border-4 border-background text-2xl shadow-card sm:size-28" />
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{c.name}</h1>
                  <Badge tone="success">✓ Verified</Badge>
                </div>
                <p className="text-muted">{[c.city, c.homeType].filter(Boolean).join(" · ")}</p>
                <div className="mt-1"><Rating value={c.ratingAvg} count={c.ratingCount} /></div>
              </div>
            </div>

            <Card>
              <CardBody>
                <h2 className="font-semibold">About</h2>
                <p className="mt-2 whitespace-pre-line text-sm">{c.bio || "This caretaker has not added a bio yet."}</p>
                <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Stat label="Price" value={`${formatPaise(c.pricePerDay)} / day`} />
                  <Stat label="Experience" value={c.experienceYears ? `${c.experienceYears} years` : "New"} />
                  <Stat label="Garden" value={c.hasGarden ? "Yes" : "No"} />
                  <Stat label="Max pets" value={c.maxPets} />
                </dl>
                <div className="mt-5 flex flex-wrap gap-2">
                  {c.acceptedPetTypes.map((t) => <span key={t} className="rounded-full bg-surface-muted px-3 py-1 text-sm">{emojiFor(t)} {t}</span>)}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h2 className="font-semibold">Reviews</h2>
                <Query q={reviews} skeleton={<p className="mt-3 text-sm text-muted">Loading reviews…</p>}>
                  {(list) => list.length ? (
                    <ul className="mt-4 space-y-4">
                      {list.map((r) => (
                        <li key={r._id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium">{nameOf(r.fromUserId)}</p>
                            <p className="text-xs text-muted">{formatDate(r.createdAt)}</p>
                          </div>
                          <p className="text-accent-500" aria-label={`${r.rating} stars`}>{"★".repeat(r.rating)}<span className="text-border-strong">{"★".repeat(5 - r.rating)}</span></p>
                          {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
                          {r.reply?.text && <p className="mt-2 rounded-md bg-surface-muted px-3 py-2 text-sm"><span className="font-medium">Reply from {c.name.split(" ")[0]}: </span>{r.reply.text}</p>}
                          <div className="mt-1 text-right"><ReportButton targetType="review" targetId={r._id} /></div>
                        </li>
                      ))}
                    </ul>
                  ) : <div className="mt-3"><EmptyState icon="⭐" title="No reviews yet" /></div>}
                </Query>
              </CardBody>
            </Card>
            <p className="text-xs text-muted">The exact address is shown only after your booking is confirmed and paid.</p>
            <div className="text-right"><ReportButton targetType="user" targetId={c.id} label="Report this caretaker" /></div>
          </div>
          <BookingForm caretaker={c} />
        </div>
      )}
    </Query>
  );
}
