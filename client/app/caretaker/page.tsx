import type { Metadata } from "next";
import { CaretakerDashboard } from "@/components/features/caretaker-views";

export const metadata: Metadata = { title: "Caretaker dashboard" };

// These areas depend on the logged-in session, which is only known in the browser, so they may block.
export const instant = false;

export default function Page() {
  return <CaretakerDashboard />;
}
