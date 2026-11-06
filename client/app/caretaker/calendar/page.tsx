import type { Metadata } from "next";
import { Calendar } from "@/components/features/caretaker-views";
import { PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Availability" };

// These areas depend on the logged-in session, which is only known in the browser, so they may block.
export const instant = false;

export default function Page() {
  return (
    <>
      <PageHeader title="Availability calendar" description="See which days are already booked." />
      <Calendar />
    </>
  );
}
