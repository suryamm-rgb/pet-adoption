"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/form";
import { Modal } from "@/components/ui/feedback";
import { cn } from "@/lib/cn";
import type { Order } from "@/lib/types";

const STEPS = [
  { status: "PLACED", label: "Placed" },
  { status: "PACKED", label: "Packed" },
  { status: "SHIPPED", label: "Shipped" },
  { status: "DELIVERED", label: "Delivered" },
] as const;

const when = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");

/** Horizontal step tracker with timestamps, plus courier and tracking number once shipped. */
export function OrderTracker({ order }: { order: Order }) {
  if (order.status === "CANCELLED") return null;
  const at = new Map((order.statusHistory ?? []).map((h) => [h.status, h.at]));
  const current = order.status === "PENDING_PAYMENT" ? -1 : STEPS.findIndex((s) => s.status === order.status);
  return (
    <div className="mt-4">
      <ol className="flex items-start" aria-label="Order progress">
        {STEPS.map((s, i) => {
          const done = i <= current;
          return (
            <li key={s.status} className="flex flex-1 flex-col items-center text-center" aria-current={i === current ? "step" : undefined}>
              <div className="flex w-full items-center">
                <span className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : i <= current ? "bg-primary" : "bg-border")} />
                <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold", done ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-surface text-muted")}>{done ? "✓" : i + 1}</span>
                <span className={cn("h-0.5 flex-1", i === STEPS.length - 1 ? "bg-transparent" : i < current ? "bg-primary" : "bg-border")} />
              </div>
              <span className={cn("mt-1.5 text-xs font-medium", done ? "text-foreground" : "text-muted")}>{s.label}</span>
              <span className="text-[10px] text-muted">{when(at.get(s.status))}</span>
            </li>
          );
        })}
      </ol>
      {order.shipment?.trackingNumber && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-muted px-3 py-2 text-sm">
          <span><span className="text-muted">Courier:</span> <strong>{order.shipment.courier}</strong></span>
          <span className="flex items-center gap-2"><span className="text-muted">Tracking no.</span> <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs">{order.shipment.trackingNumber}</code>
            <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => navigator.clipboard?.writeText(order.shipment!.trackingNumber!)}>Copy</button>
          </span>
        </div>
      )}
    </div>
  );
}

/** Asks for courier and tracking number before an order is marked shipped. */
export function ShipModal({ open, onClose, onShip, busy }: { open: boolean; onClose: () => void; onShip: (v: { courier: string; trackingNumber: string }) => void; busy?: boolean }) {
  const [error, setError] = useState("");
  return (
    <Modal open={open} onClose={onClose} title="Ship this order">
      <form className="space-y-4" onSubmit={(e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        const courier = String(d.get("courier")).trim();
        const trackingNumber = String(d.get("trackingNumber")).trim();
        if (courier.length < 2 || trackingNumber.length < 3) return setError("Enter the courier and the tracking number");
        setError("");
        onShip({ courier, trackingNumber });
      }}>
        <p className="text-sm text-muted">The buyer is notified and can follow the shipment with these details.</p>
        <FormError message={error} />
        <Field label="Courier" htmlFor="courier"><Input id="courier" name="courier" placeholder="Delhivery, BlueDart, India Post…" required /></Field>
        <Field label="Tracking number" htmlFor="trackingNumber"><Input id="trackingNumber" name="trackingNumber" required /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" loading={busy}>Mark as shipped</Button></div>
      </form>
    </Modal>
  );
}
