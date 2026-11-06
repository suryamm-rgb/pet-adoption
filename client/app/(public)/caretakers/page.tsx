import type { Metadata } from "next";
import { Suspense } from "react";
import { CaretakerSearch } from "@/components/features/caretaker-search";
import { CaretakerGridSkeleton } from "@/components/features/caretaker-card";
import { PublicHero } from "@/components/ui/misc";
import { photo } from "@/lib/images";

export const metadata: Metadata = { title: "Find caretakers" };

export default function CaretakersPage() {
  return (
    <>
      <PublicHero title="Find a caretaker" description="Only admin-verified caretakers appear here." image={photo("runner", 640, 480)} />
      <div className="mx-auto max-w-page px-4 py-10">
        <Suspense fallback={<CaretakerGridSkeleton />}>
          <CaretakerSearch />
        </Suspense>
      </div>
    </>
  );
}
