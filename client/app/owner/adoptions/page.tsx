import type { Metadata } from "next";
import { MyAdoptionRequests } from "@/components/features/owner-views";
import { PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Adoption requests" };

// These areas depend on the logged-in session, which is only known in the browser, so they may block.
export const instant = false;

export default function Page() {
  return (
    <>
      <PageHeader title="Adoption requests" description="Pets you asked to adopt." />
      <MyAdoptionRequests />
    </>
  );
}
