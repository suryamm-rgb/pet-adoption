import type { Metadata } from "next";
import { Stays } from "@/components/features/caretaker-views";
import { PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Active stays" };

// These areas depend on the logged-in session, which is only known in the browser, so they may block.
export const instant = false;

export default function Page() {
  return (
    <>
      <PageHeader title="Stays" description="Post a daily update for every active stay." />
      <Stays />
    </>
  );
}
