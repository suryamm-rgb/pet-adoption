import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";

const nav = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/verifications", label: "Verifications", icon: "✅" },
  { href: "/admin/listings", label: "Listing approvals", icon: "📋" },
  { href: "/admin/bookings", label: "Bookings", icon: "📅" },
  { href: "/admin/payments", label: "Payments & payouts", icon: "💳" },
  { href: "/admin/orders", label: "Shop orders", icon: "📦" },
  { href: "/admin/disputes", label: "Disputes", icon: "⚖️" },
  { href: "/admin/reports", label: "Reports", icon: "🛡️" },
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/audit", label: "Audit log", icon: "📜" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
];

// These areas depend on the logged-in session, which is only known in the browser, so they may block.
export const instant = false;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <Suspense><DashboardShell role="admin" title="Admin" nav={nav}>{children}</DashboardShell></Suspense>;
}
