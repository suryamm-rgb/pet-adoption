import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingDetail } from "@/components/features/booking-detail";
import { PageSkeleton } from "@/components/ui/feedback";

export const metadata: Metadata = { title: "Booking details" };

// These areas depend on the logged-in session, which is only known in the browser, so they may block.
export const instant = false;

export default function Page() {
  return <Suspense fallback={<PageSkeleton />}><BookingDetail role="admin" /></Suspense>;
}
