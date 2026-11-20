import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountSettings } from "@/components/features/account-views";
import { PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Account settings", robots: { index: false } };

// Depends on the logged-in session, which is only known in the browser.
export const instant = false;

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <PageHeader title="Account settings" description="Manage your details, password and sessions." />
      <Suspense><AccountSettings /></Suspense>
    </div>
  );
}
