import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/* One look for every text box, date picker and dropdown: white, soft border, visible hover, teal focus ring. */
const control =
  "w-full rounded-lg border border-border-strong bg-surface px-3.5 text-sm text-foreground shadow-sm placeholder:text-muted/70 transition hover:border-primary/50 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 aria-[invalid=true]:border-danger-600 aria-[invalid=true]:ring-danger-600/15 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted";

export function Field({ label, hint, error, htmlFor, children }: { label: string; hint?: string; error?: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">{label}</label>
      {children}
      {error ? <p role="alert" className="text-xs text-danger-600">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-11", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(control, "h-11 cursor-pointer select-chevron pr-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-28 py-2.5", className)} {...props} />;
}

export function Checkbox({ label, ...props }: ComponentProps<"input"> & { label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" className="size-4 rounded border-border-strong accent-[var(--primary)]" {...props} />
      {label}
    </label>
  );
}

export function FormError({ message }: { message?: string }) {
  return message ? <p role="alert" className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">{message}</p> : null;
}
