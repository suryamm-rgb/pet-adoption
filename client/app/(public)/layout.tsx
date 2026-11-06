import { Suspense } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="bg-sunny px-4 py-2 text-center text-xs font-semibold text-white sm:text-sm">
        Every caretaker is ID-verified · Your payment is held until your pet is back home
      </div>
      <Suspense fallback={<div className="h-header border-b border-border bg-surface" />}>
        <SiteHeader />
      </Suspense>
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
