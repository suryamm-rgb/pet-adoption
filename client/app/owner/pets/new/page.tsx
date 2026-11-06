import type { Metadata } from "next";
import { PetForm } from "@/components/features/pet-form";
import { PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Add pet" };

// These areas depend on the logged-in session, which is only known in the browser, so they may block.
export const instant = false;

export default function NewPetPage() {
  return (
    <>
      <PageHeader title="Add a pet" description="The more you share, the better your caretaker can look after them." />
      <PetForm />
    </>
  );
}
