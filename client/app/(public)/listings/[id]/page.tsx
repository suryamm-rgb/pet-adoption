import type { Metadata } from "next";
import { Suspense } from "react";
import { ListingDetail } from "@/components/features/listing-views";
import { PageSkeleton } from "@/components/ui/feedback";

export const metadata: Metadata = { title: "Listing" };

export default function ListingPage() {
  return (
    <div className="mx-auto max-w-page px-4 py-10">
      <Suspense fallback={<PageSkeleton />}><ListingDetail /></Suspense>
    </div>
  );
}
