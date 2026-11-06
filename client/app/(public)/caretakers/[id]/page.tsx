import type { Metadata } from "next";
import { Suspense } from "react";
import { CaretakerDetail } from "@/components/features/caretaker-detail";
import { PageSkeleton } from "@/components/ui/feedback";

export const metadata: Metadata = { title: "Caretaker profile" };

export default function CaretakerPage() {
  return (
    <div className="mx-auto max-w-page px-4 py-10">
      <Suspense fallback={<PageSkeleton />}>
        <CaretakerDetail />
      </Suspense>
    </div>
  );
}
