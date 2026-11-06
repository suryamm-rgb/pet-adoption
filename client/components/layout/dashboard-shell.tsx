"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/feedback";
import { useToast } from "@/components/toast";
import { useAuth, useRequireAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import type { Role } from "@/lib/types";
import { NotificationBell } from "./notification-bell";
import { Logo } from "./site-header";
import { UserMenu } from "./user-menu";

export type NavItem = { href: string; label: string; icon: string };

function RoleGate({ role, children }: { role: Role; children: React.ReactNode }) {
  const { user, loading } = useRequireAuth();
  const { addRole } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (loading || !user) return <PageSkeleton />;
  if (user.roles.includes(role)) return <>{children}</>;

  const canSelfAssign = role === "caretaker" || role === "seller" || role === "owner";
  return (
    <Card className="mx-auto mt-10 max-w-md">
      <CardBody className="text-center">
        <p className="text-4xl" aria-hidden>🔒</p>
        <h1 className="mt-2 text-lg font-semibold">This area is for {role}s</h1>
        <p className="mt-1 text-sm text-muted">{canSelfAssign ? `Add the ${role} role to your account to continue.` : "Your account does not have access."}</p>
        {canSelfAssign && (
          <Button className="mt-4" loading={busy} onClick={async () => { setBusy(true); try { await addRole(role); } catch { toast("error", "Could not add the role"); } finally { setBusy(false); } }}>
            Become a {role}
          </Button>
        )}
      </CardBody>
    </Card>
  );
}

export function DashboardShell({ role, title, nav, children }: { role: Role; title: string; nav: NavItem[]; children: React.ReactNode }) {
  const pathname = usePathname();
  // The drawer closes by itself on navigation: it is only "open" for the path it was opened on.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;
  const setOpen = (v: boolean) => setOpenedAt(v ? pathname : null);
  const root = nav[0].href;

  const links = (
    <ul className="space-y-0.5">
      {nav.map((item) => {
        const active = item.href === root ? pathname === root : pathname.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link href={item.href} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors", active ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-muted hover:text-foreground")}>
              <span aria-hidden className="w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="min-h-screen md:pl-sidebar">
      <aside className="fixed inset-y-0 left-0 hidden w-sidebar flex-col overflow-y-auto border-r border-border bg-surface p-4 md:flex">
        <div className="mb-6 px-1"><Logo /></div>
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
        <nav aria-label={title}>{links}</nav>
        <Link href="/" className="mt-auto rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-surface-muted">← Back to site</Link>
      </aside>

      {open && <button type="button" aria-label="Close menu" className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)} />}
      <aside className={cn("fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] overflow-y-auto border-r border-border bg-surface p-4 transition-transform md:hidden", open ? "translate-x-0" : "-translate-x-full")} aria-hidden={!open}>
        <div className="mb-6 flex items-center justify-between px-1"><Logo /><button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="size-9 rounded-md hover:bg-surface-muted">✕</button></div>
        <nav aria-label={`${title} mobile`}>{links}</nav>
        <Link href="/" className="mt-4 block rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-surface-muted">← Back to site</Link>
      </aside>

      <header className="sticky top-0 z-20 flex h-header items-center justify-between border-b border-border bg-surface/85 px-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <button type="button" className="inline-flex size-10 items-center justify-center rounded-md hover:bg-surface-muted md:hidden" aria-expanded={open} aria-label="Open menu" onClick={() => setOpen(true)}>☰</button>
          <span className="text-sm font-medium text-muted">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto max-w-page p-4 pb-16 sm:p-6">
        <RoleGate role={role}>{children}</RoleGate>
      </main>
    </div>
  );
}
