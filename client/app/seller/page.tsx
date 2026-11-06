import type { Metadata } from "next";
import { MyListings } from "@/components/features/seller-views";

export const metadata: Metadata = { title: "My listings" };

// These areas depend on the logged-in session, which is only known in the browser, so they may block.
export const instant = false;

export default function Page() {
  return <MyListings />;
}
