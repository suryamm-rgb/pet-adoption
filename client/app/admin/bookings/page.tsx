import type { Metadata } from "next";
import { AllBookings } from "@/components/features/admin-views";

export const metadata: Metadata = { title: "Bookings" };

// These areas depend on the logged-in session, which is only known in the browser, so they may block.
export const instant = false;

export default function Page() {
  return <AllBookings />;
}
