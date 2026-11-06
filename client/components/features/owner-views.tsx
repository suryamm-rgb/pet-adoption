"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, StatCard } from "@/components/ui/card";
import { Query } from "@/components/ui/feedback";
import { EmptyState, Section, WelcomeBanner } from "@/components/ui/misc";
import { photo } from "@/lib/images";
import { Table, Td, Th } from "@/components/ui/table";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatPaise } from "@/lib/format";
import { useGet } from "@/lib/hooks";
import { nameOf, type AdoptionRequest, type Booking, type Listing, type Payment, type Pet, type Review } from "@/lib/types";
import { BookingTable } from "./booking-table";

export function OwnerDashboard() {
  const { user } = useAuth();
  const pets = useGet<Pet[]>("/pets/mine", ["pets"]);
  const bookings = useGet<Booking[]>("/bookings/mine?as=owner", ["bookings", "owner"]);
  return (
    <>
      <WelcomeBanner title={`Hello, ${user?.name.split(" ")[0] ?? ""} 👋`} text="Here is what is happening with your pets." image={photo("golden", 600, 400)} action={<ButtonLink href="/caretakers" variant="accent">Book a caretaker</ButtonLink>} />
      <Query q={bookings}>
        {(list) => {
          const needsPayment = list.filter((b) => b.status === "ACCEPTED");
          const active = list.filter((b) => ["PAID", "IN_CARE"].includes(b.status));
          return (
            <div className="space-y-8">
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard icon="🐶" label="My pets" value={String(pets.data?.length ?? "–")} />
                <StatCard icon="📅" label="Active bookings" value={String(active.length)} />
                <StatCard icon="🧾" label="Total bookings" value={String(list.length)} />
              </div>
              {!!needsPayment.length && (
                <Card className="border-accent-300 bg-accent-50 text-foreground dark:bg-accent-700/20"><CardBody className="flex flex-wrap items-center justify-between gap-3">
                  <div><p className="font-semibold">Payment needed</p><p className="text-sm text-muted">{needsPayment.length} accepted booking{needsPayment.length > 1 ? "s are" : " is"} waiting for payment.</p></div>
                  <ButtonLink href={`/owner/bookings/${needsPayment[0]._id}`} variant="accent">Pay now</ButtonLink>
                </CardBody></Card>
              )}
              {pets.data && !pets.data.length && <EmptyState icon="🐶" title="Add your first pet" text="Create a profile with vaccination details to start booking." action={<ButtonLink href="/owner/pets/new">Add a pet</ButtonLink>} />}
              <Section title="Recent bookings" action={<Link href="/owner/bookings" className="text-sm font-medium text-primary hover:underline">View all</Link>}>
                <BookingTable rows={list.slice(0, 5)} viewer="owner" base="/owner/bookings" empty={<EmptyState icon="📅" title="No bookings yet" action={<ButtonLink href="/caretakers">Find a caretaker</ButtonLink>} />} />
              </Section>
            </div>
          );
        }}
      </Query>
    </>
  );
}

export function OwnerBookings() {
  const q = useGet<Booking[]>("/bookings/mine?as=owner", ["bookings", "owner"]);
  return <Query q={q}>{(list) => <BookingTable rows={list} viewer="owner" base="/owner/bookings" empty={<EmptyState icon="📅" title="No bookings yet" action={<ButtonLink href="/caretakers">Find a caretaker</ButtonLink>} />} />}</Query>;
}

export function OwnerPayments() {
  const payments = useGet<Payment[]>("/payments/mine", ["payments", "mine"]);
  const bookings = useGet<Booking[]>("/bookings/mine?as=owner", ["bookings", "owner"]);
  return (
    <Query q={payments}>
      {(list) => {
        const byBooking = new Map((bookings.data ?? []).map((b) => [b._id, b]));
        const rows = list.filter((p) => p.bookingId && byBooking.has(p.bookingId));
        if (!rows.length) return <EmptyState icon="💳" title="No payments yet" text="Payments appear here after you pay for a booking." />;
        return (
          <Table>
            <thead><tr><Th>Date</Th><Th>Booking</Th><Th>Amount</Th><Th>Status</Th><Th>Refunded</Th><Th><span className="sr-only">Invoice</span></Th></tr></thead>
            <tbody>
              {rows.map((p) => {
                const b = byBooking.get(p.bookingId!)!;
                const refunded = p.refunds.reduce((s, r) => s + r.amount, 0);
                return (
                  <tr key={p._id}>
                    <Td className="whitespace-nowrap">{formatDate(p.createdAt)}</Td>
                    <Td><Link className="text-primary hover:underline" href={`/owner/bookings/${b._id}`}>{nameOf(b.petId)} with {nameOf(b.caretakerId)}</Link></Td>
                    <Td>{formatPaise(p.amount)}</Td>
                    <Td><Badge tone={p.status === "captured" ? "success" : p.status === "failed" ? "danger" : "neutral"}>{p.status.replace("_", " ")}</Badge></Td>
                    <Td>{refunded ? formatPaise(refunded) : "–"}</Td>
                    <Td>{p.status !== "created" && p.status !== "failed" && <a className="font-medium text-primary hover:underline" href={`${API_URL}/bookings/${b._id}/invoice`} target="_blank" rel="noreferrer">Invoice</a>}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        );
      }}
    </Query>
  );
}

const Stars = ({ n }: { n: number }) => <span className="text-accent-500" aria-label={`${n} stars`}>{"★".repeat(n)}<span className="text-border-strong">{"★".repeat(5 - n)}</span></span>;

export function OwnerReviews() {
  const q = useGet<{ received: Review[]; given: Review[] }>("/bookings/reviews/mine", ["reviews", "mine"]);
  const bookings = useGet<Booking[]>("/bookings/mine?as=owner", ["bookings", "owner"]);
  return (
    <Query q={q}>
      {({ received, given }) => {
        const reviewed = new Set(given.map((r) => r.bookingId));
        const pending = (bookings.data ?? []).filter((b) => b.status === "COMPLETED" && !reviewed.has(b._id));
        const list = (items: Review[], who: "from" | "to") => items.length ? (
          <ul className="space-y-3">{items.map((r) => (
            <li key={r._id}><Card><CardBody>
              <div className="flex justify-between gap-2"><p className="text-sm font-medium">{nameOf(who === "from" ? r.fromUserId : r.toUserId)}</p><p className="text-xs text-muted">{formatDate(r.createdAt)}</p></div>
              <Stars n={r.rating} />{r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
            </CardBody></Card></li>
          ))}</ul>
        ) : <EmptyState icon="⭐" title="Nothing here yet" />;
        return (
          <div className="space-y-8">
            {!!pending.length && <Section title="Waiting for your review"><ul className="space-y-2">{pending.map((b) => <li key={b._id}><Link href={`/owner/bookings/${b._id}`} className="flex items-center justify-between rounded-lg border border-border bg-surface p-3 text-sm hover:bg-surface-muted"><span>{nameOf(b.petId)} with {nameOf(b.caretakerId)}</span><span className="font-medium text-primary">Review →</span></Link></li>)}</ul></Section>}
            <div className="grid gap-8 lg:grid-cols-2"><Section title="Reviews you received">{list(received, "from")}</Section><Section title="Reviews you wrote">{list(given, "to")}</Section></div>
          </div>
        );
      }}
    </Query>
  );
}

export function MyAdoptionRequests() {
  const q = useGet<AdoptionRequest[]>("/listings/requests/mine", ["requests", "mine"]);
  return (
    <Query q={q}>
      {(list) => list.length ? (
        <ul className="space-y-3">{list.map((r) => {
          const l = r.listingId as Listing;
          return (
            <li key={r._id}><Card><CardBody className="flex flex-wrap items-center justify-between gap-3">
              <div><Link href={`/listings/${l._id}`} className="font-medium hover:underline">{l.title}</Link><p className="text-sm text-muted">Requested {formatDate(r.createdAt)}</p></div>
              <Badge tone={r.status === "approved" ? "success" : r.status === "rejected" ? "danger" : r.status === "completed" ? "brand" : "warning"}>{r.status}</Badge>
            </CardBody></Card></li>
          );
        })}</ul>
      ) : <EmptyState icon="💞" title="No adoption requests" text="Browse pets waiting for a home." action={<ButtonLink href="/adopt">Adopt a pet</ButtonLink>} />}
    </Query>
  );
}
