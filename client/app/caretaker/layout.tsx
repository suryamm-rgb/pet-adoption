import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";

const nav = [
  { href: "/caretaker", label: "Dashboard", icon: "🏠" },
  { href: "/caretaker/profile", label: "Profile & verification", icon: "🪪" },
  { href: "/caretaker/requests", label: "Booking requests", icon: "📩" },
  { href: "/caretaker/stays", label: "Active stays", icon: "🐕" },
  { href: "/caretaker/calendar", label: "Availability", icon: "🗓️" },
  { href: "/caretaker/earnings", label: "Earnings", icon: "💰" },
];

// These areas depend on the logged-in session, which is only known in the browser, so they may block.
export const instant = false;

export default function CaretakerLayout({ children }: { children: React.ReactNode }) {
  return <Suspense><DashboardShell role="caretaker" title="Caretaker" nav={nav}>{children}</DashboardShell></Suspense>;
}
