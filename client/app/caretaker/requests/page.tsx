import type { Metadata } from "next";
import { Requests } from "@/components/features/caretaker-views";
import { PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Booking requests" };

// These areas depend on the logged-in session, which is only known in the browser, so they may block.
export const instant = false;

export default function Page() {
  return (
    <>
      <PageHeader title="Booking requests" description="Reply within 24 hours or the request expires." />
      <Requests />
    </>
  );
}
