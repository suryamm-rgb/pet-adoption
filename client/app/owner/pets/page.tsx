import type { Metadata } from "next";
import { PetList } from "@/components/features/pet-views";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "My pets" };

// These areas depend on the logged-in session, which is only known in the browser, so they may block.
export const instant = false;

export default function PetsPage() {
  return (
    <>
      <PageHeader title="My pets" action={<ButtonLink href="/owner/pets/new">Add pet</ButtonLink>} />
      <PetList />
    </>
  );
}
