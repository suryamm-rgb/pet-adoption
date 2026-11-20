"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/feedback";
import { useToast } from "@/components/toast";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export type ReportTarget = "review" | "listing" | "product" | "message" | "user";

/** Small "Report" link that opens a dialog. Hidden for anonymous visitors. */
export function ReportButton({ targetType, targetId, label = "Report" }: { targetType: ReportTarget; targetId: string; label?: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!user) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-muted underline hover:text-danger-600">{label}</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Report to our team">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const d = new FormData(e.currentTarget);
            setBusy(true);
            setError("");
            try {
              await api("/reports", { method: "POST", body: { targetType, targetId, reason: d.get("reason"), details: d.get("details") || undefined } });
              toast("success", "Thanks. Our team will review this.");
              setOpen(false);
            } catch (err) {
              setError(errorText(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <FormError message={error} />
          <Field label="Reason" htmlFor={`reason-${targetId}`}>
            <Select id={`reason-${targetId}`} name="reason" defaultValue="inappropriate">
              <option value="inappropriate">Inappropriate content</option>
              <option value="abuse">Abuse or harassment</option>
              <option value="fraud">Scam or fraud</option>
              <option value="spam">Spam</option>
              <option value="other">Something else</option>
            </Select>
          </Field>
          <Field label="Details (optional)" htmlFor={`details-${targetId}`}><Textarea id={`details-${targetId}`} name="details" maxLength={500} /></Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={busy}>Send report</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
