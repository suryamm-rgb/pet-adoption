import type { Metadata } from "next";
import { NewListingForm } from "@/components/features/listing-views";

export const metadata: Metadata = { title: "New listing" };

// These areas depend on the logged-in session, which is only known in the browser, so they may block.
export const instant = false;

export default function Page() {
  return <NewListingForm />;
}
