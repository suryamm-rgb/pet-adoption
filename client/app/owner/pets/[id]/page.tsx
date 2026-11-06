import type { Metadata } from "next";
import { Suspense } from "react";
import { EditPet } from "@/components/features/pet-views";
import { PageSkeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Edit pet" };

// These areas depend on the logged-in session, which is only known in the browser, so they may block.
export const instant = false;

export default function EditPetPage() {
  return (
    <>
      <PageHeader title="Pet profile" description="While a stay is active only care details can change, and your caretaker is notified." />
      <Suspense fallback={<PageSkeleton />}><EditPet /></Suspense>
    </>
  );
}
