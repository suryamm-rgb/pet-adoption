import type { BookingStatus } from "@/lib/types";
import { cn } from "@/lib/cn";

export type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-muted text-muted",
  brand: "bg-primary-soft text-primary",
  success: "bg-success-50 text-success-700",
  warning: "bg-warning-50 text-warning-700",
  danger: "bg-danger-50 text-danger-700",
  info: "bg-info-50 text-info-700",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone])}>{children}</span>;
}

const statusTone: Record<BookingStatus, Tone> = {
  REQUESTED: "warning", ACCEPTED: "info", PAID: "brand", IN_CARE: "success", COMPLETED: "neutral",
  REJECTED: "danger", EXPIRED: "neutral", CANCELLED: "danger", DISPUTED: "danger", REFUNDED: "info",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone[status as BookingStatus] ?? "neutral"}>{status.replace("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase())}</Badge>;
}
