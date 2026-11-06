import type { Metadata } from "next";
import { OwnerBookings } from "@/components/features/owner-views";
import { PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "My bookings" };

// These areas depend on the logged-in session, which is only known in the browser, so they may block.
export const instant = false;

export default function Page() {
  return (
    <>
      <PageHeader title="My bookings" description="Track requests, payments and stays." />
      <OwnerBookings />
    </>
  );
}
