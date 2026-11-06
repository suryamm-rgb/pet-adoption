"use client";

import { useEffect, useRef } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { cn } from "@/lib/cn";
import { errorText } from "@/lib/api";

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-shimmer rounded-md bg-[linear-gradient(90deg,var(--surface-muted)_25%,var(--border)_50%,var(--surface-muted)_75%)] bg-[length:200%_100%]", className)} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy aria-label="Loading">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24" /> <Skeleton className="h-24" /> <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-48" />
    </div>
  );
}

/** Renders loading, error and success states for a query so pages stay short. */
export function Query<T>({ q, children, skeleton }: { q: UseQueryResult<T>; children: (data: T) => React.ReactNode; skeleton?: React.ReactNode }) {
  if (q.isPending) return <>{skeleton ?? <PageSkeleton />}</>;
  if (q.isError) {
    return (
      <div role="alert" className="rounded-lg border border-danger-600/30 bg-danger-50 p-5 text-sm text-danger-700">
        <p className="font-medium">We could not load this.</p>
        <p className="mt-1">{errorText(q.error)}</p>
        <button type="button" onClick={() => q.refetch()} className="mt-3 font-medium underline">Try again</button>
      </div>
    );
  }
  return <>{children(q.data)}</>;
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-surface p-0 text-foreground shadow-pop backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-m-1 rounded-md p-1 text-muted hover:bg-surface-muted">✕</button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </dialog>
  );
}

export function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Rating" className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => onChange(n)} className={cn("text-3xl leading-none transition-transform hover:scale-110", n <= value ? "text-accent-500" : "text-border-strong")}>
          ★
        </button>
      ))}
    </div>
  );
}
