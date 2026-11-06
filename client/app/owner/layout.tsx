import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";

const nav = [
  { href: "/owner", label: "Dashboard", icon: "🏠" },
  { href: "/owner/pets", label: "My pets", icon: "🐶" },
  { href: "/owner/bookings", label: "My bookings", icon: "📅" },
  { href: "/owner/payments", label: "Payments", icon: "💳" },
  { href: "/owner/reviews", label: "Reviews", icon: "⭐" },
  { href: "/owner/adoptions", label: "Adoption requests", icon: "💞" },
  { href: "/owner/orders", label: "Shop orders", icon: "📦" },
  { href: "/caretakers", label: "Find caretakers", icon: "🔎" },
];

// These areas depend on the logged-in session, which is only known in the browser, so they may block.
export const instant = false;

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return <Suspense><DashboardShell role="owner" title="Pet owner" nav={nav}>{children}</DashboardShell></Suspense>;
}
