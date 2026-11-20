import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";

const nav = [
  { href: "/seller", label: "My listings", icon: "📋" },
  { href: "/seller/listings/new", label: "New listing", icon: "➕" },
  { href: "/seller/requests", label: "Adoption requests", icon: "💞" },
  { href: "/seller/products", label: "Products", icon: "🛍️" },
  { href: "/seller/orders", label: "Shop orders", icon: "📦" },
];

// These areas depend on the logged-in session, which is only known in the browser, so they may block.
export const instant = false;

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return <Suspense><DashboardShell role="seller" title="Seller / shelter" nav={nav}>{children}</DashboardShell></Suspense>;
}
