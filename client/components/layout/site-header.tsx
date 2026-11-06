"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { useAuth, homeFor } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/cn";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";

const links = [
  { href: "/caretakers", label: "Find caretakers" },
  { href: "/adopt", label: "Adopt" },
  { href: "/pets-for-sale", label: "Buy a pet" },
  { href: "/shop", label: "Shop" },
];

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
      <span aria-hidden className="flex size-8 items-center justify-center rounded-lg bg-brand-gradient text-base shadow-glow">🐾</span>
      PawStay
    </Link>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { count } = useCart();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur">
      <div className="mx-auto flex h-header max-w-page items-center justify-between gap-4 px-4">
        <Logo />

        <nav className="hidden items-center gap-1 text-sm md:flex" aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={pathname.startsWith(l.href) ? "page" : undefined} className={cn("rounded-md px-3 py-2 font-medium", pathname.startsWith(l.href) ? "bg-primary-soft text-primary" : "text-muted hover:text-foreground")}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/shop/cart" aria-label={`Cart, ${count} items`} className="relative inline-flex size-10 items-center justify-center rounded-md hover:bg-surface-muted">
            <span aria-hidden>🛒</span>
            {count > 0 && <span className="absolute right-1 top-1 min-w-4 rounded-full bg-accent-500 px-1 text-center text-[10px] font-semibold leading-4 text-white">{count}</span>}
          </Link>
          {user ? (
            <>
              <NotificationBell />
              <span className="hidden sm:block"><ButtonLink href={homeFor(user)} size="sm" variant="secondary">Dashboard</ButtonLink></span>
              <UserMenu />
            </>
          ) : (
            !loading && (
              <div className="hidden items-center gap-2 sm:flex">
                <ButtonLink href="/login" variant="ghost" size="sm">Log in</ButtonLink>
                <ButtonLink href="/register" size="sm">Sign up</ButtonLink>
              </div>
            )
          )}
          <button type="button" className="inline-flex size-10 items-center justify-center rounded-md hover:bg-surface-muted md:hidden" aria-expanded={open} aria-controls="mobile-nav" aria-label="Toggle menu" onClick={() => setOpen((v) => !v)}>
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" className="border-t border-border bg-surface px-4 py-3 md:hidden" aria-label="Mobile">
          <ul className="space-y-1">
            {[...links, ...(user ? [{ href: homeFor(user), label: "Dashboard" }] : [{ href: "/login", label: "Log in" }, { href: "/register", label: "Sign up" }])].map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2.5 text-sm font-medium hover:bg-surface-muted">{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
