"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/misc";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/types";

const areas: { role: Role; href: string; label: string }[] = [
  { role: "owner", href: "/owner", label: "Owner area" },
  { role: "caretaker", href: "/caretaker", label: "Caretaker area" },
  { role: "seller", href: "/seller", label: "Seller area" },
  { role: "admin", href: "/admin", label: "Admin area" },
];

export function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!user) return null;
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Account menu" className="flex items-center gap-2 rounded-full p-0.5 hover:bg-surface-muted">
        <Avatar name={user.name} className="size-9 text-xs" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-40 w-56 rounded-xl border border-border bg-surface p-1.5 shadow-pop">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <div className="my-1 border-t border-border" />
          {areas.filter((a) => user.roles.includes(a.role)).map((a) => (
            <Link key={a.href} href={a.href} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm hover:bg-surface-muted">{a.label}</Link>
          ))}
          <button type="button" onClick={async () => { await logout(); setOpen(false); router.push("/"); }} className="mt-1 block w-full rounded-md px-3 py-2 text-left text-sm text-danger-600 hover:bg-danger-50">Log out</button>
        </div>
      )}
    </div>
  );
}
