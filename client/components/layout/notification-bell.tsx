"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useGet } from "@/lib/hooks";
import { getSocket } from "@/lib/socket";
import type { Notification } from "@/lib/types";
import { cn } from "@/lib/cn";

export function NotificationBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data } = useGet<{ items: Notification[]; unread: number }>("/notifications", ["notifications"], { refetchInterval: 60_000 });

  useEffect(() => {
    const socket = getSocket();
    const refresh = () => qc.invalidateQueries({ queryKey: ["notifications"] });
    socket.on("notification:new", refresh);
    return () => void socket.off("notification:new", refresh);
  }, [qc]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function readAll() {
    await api("/notifications/read-all", { method: "PATCH" });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label={`Notifications${data?.unread ? `, ${data.unread} unread` : ""}`} aria-expanded={open} className="relative inline-flex size-10 items-center justify-center rounded-md hover:bg-surface-muted">
        <span aria-hidden>🔔</span>
        {!!data?.unread && <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-semibold leading-4 text-white">{data.unread > 9 ? "9+" : data.unread}</span>}
      </button>
      {open && (
        <div className="fixed inset-x-3 top-16 z-40 max-h-[70vh] overflow-auto rounded-xl border border-border bg-surface shadow-pop sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-semibold">Notifications</p>
            {!!data?.unread && <button type="button" onClick={readAll} className="text-xs font-medium text-primary hover:underline">Mark all read</button>}
          </div>
          {data?.items.length ? (
            <ul>
              {data.items.map((n) => (
                <li key={n._id} className={cn("border-b border-border last:border-0", !n.readAt && "bg-primary-soft/50")}>
                  <Link href={n.link ?? "#"} onClick={() => { setOpen(false); api(`/notifications/${n._id}/read`, { method: "PATCH" }).then(() => qc.invalidateQueries({ queryKey: ["notifications"] })); }} className="block px-4 py-3 hover:bg-surface-muted">
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{n.body}</p>}
                    <p className="mt-1 text-xs text-muted">{formatDateTime(n.createdAt)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-center text-sm text-muted">You are all caught up.</p>
          )}
        </div>
      )}
    </div>
  );
}
