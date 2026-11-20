import type { Metadata } from "next";
import { OwnerReviews } from "@/components/features/owner-views";
import { PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Reviews" };

// These areas depend on the logged-in session, which is only known in the browser, so they may block.
export const instant = false;

export default function Page() {
  return (
    <>
      <PageHeader title="Reviews" description="Reply to feedback from pet owners or report anything inappropriate." />
      <OwnerReviews showPending={false} />
    </>
  );
}
