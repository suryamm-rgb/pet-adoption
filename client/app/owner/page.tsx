import type { Metadata } from "next";
import { OwnerDashboard } from "@/components/features/owner-views";

export const metadata: Metadata = { title: "Owner dashboard" };

// These areas depend on the logged-in session, which is only known in the browser, so they may block.
export const instant = false;

export default function Page() {
  return <OwnerDashboard />;
}
