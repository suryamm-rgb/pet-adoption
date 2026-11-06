import type { Metadata } from "next";
import { Earnings } from "@/components/features/caretaker-views";
import { PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Earnings" };

// These areas depend on the logged-in session, which is only known in the browser, so they may block.
export const instant = false;

export default function Page() {
  return (
    <>
      <PageHeader title="Earnings" description="Payouts are released after each completed stay." />
      <Earnings />
    </>
  );
}
