import type { Metadata } from "next";
import { OwnerPayments } from "@/components/features/owner-views";
import { PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Payments" };

// These areas depend on the logged-in session, which is only known in the browser, so they may block.
export const instant = false;

export default function Page() {
  return (
    <>
      <PageHeader title="Payments and invoices" description="Every payment, refund and invoice." />
      <OwnerPayments />
    </>
  );
}
