"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, FormError, Input } from "@/components/ui/form";
import { Modal, PageSkeleton } from "@/components/ui/feedback";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/toast";
import { api, errorText } from "@/lib/api";
import { useAuth, useRequireAuth } from "@/lib/auth";
import { useGet } from "@/lib/hooks";
import { disablePush, enablePush, isPushOn, pushSupported } from "@/lib/push";
import type { Settings, User } from "@/lib/types";

function ProfileCard({ user }: { user: User }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Card>
      <CardBody>
        <h2 className="font-semibold">Your details</h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const d = new FormData(e.currentTarget);
            setBusy(true);
            setError("");
            try {
              const { user: updated } = await api<{ user: User }>("/auth/me", { method: "PATCH", body: { name: d.get("name"), phone: d.get("phone"), city: d.get("city") } });
              qc.setQueryData(["me"], updated);
              toast("success", "Profile updated");
            } catch (err) {
              setError(errorText(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <FormError message={error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="name"><Input id="name" name="name" required minLength={2} defaultValue={user.name} /></Field>
            <Field label="City" htmlFor="city"><Input id="city" name="city" defaultValue={user.city ?? ""} /></Field>
            <Field label="Phone" htmlFor="phone"><Input id="phone" name="phone" type="tel" defaultValue={user.phone ?? ""} /></Field>
            <Field label="Email" htmlFor="email" hint={user.emailVerified ? "Verified" : "Not verified yet"}><Input id="email" value={user.email} disabled readOnly /></Field>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" loading={busy}>Save changes</Button>
            {user.emailVerified ? <Badge tone="success">Email verified</Badge> : <Badge tone="warning">Email not verified</Badge>}
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

function PhoneCard({ user }: { user: User }) {
  const qc = useQueryClient();
  const toast = useToast();
  const settings = useGet<Settings>("/settings/public", ["settings", "public"]);
  const [step, setStep] = useState<"idle" | "code">("idle");
  const [sentTo, setSentTo] = useState("");
  const [devCode, setDevCode] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const required = settings.data?.features?.phoneVerificationRequired;

  if (user.phoneVerified) {
    return (
      <Card><CardBody className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="font-semibold">Phone number</h2><p className="text-sm text-muted">{user.phone}</p></div>
        <Badge tone="success">Verified</Badge>
      </CardBody></Card>
    );
  }
  async function send() {
    setBusy(true); setError("");
    try {
      const r = await api<{ sentTo: string; devCode?: string }>("/auth/phone/send-otp", { method: "POST" });
      setSentTo(r.sentTo); setDevCode(r.devCode); setStep("code");
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  return (
    <Card><CardBody>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Verify your phone number</h2>
        <Badge tone="warning">Not verified</Badge>
      </div>
      <p className="mt-1 text-sm text-muted">{required ? "Caretakers must verify their phone before they can be approved. " : ""}A verified number lets us send WhatsApp alerts and keeps the community safe.</p>
      {!user.phone ? <p className="mt-3 text-sm">Add your phone number in the details above and save, then come back here.</p> : step === "idle" ? (
        <div className="mt-3 flex items-center gap-3"><Button onClick={send} loading={busy}>Send code to {user.phone}</Button></div>
      ) : (
        <form className="mt-3 space-y-3" onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true); setError("");
          try {
            const { user: updated } = await api<{ user: User }>("/auth/phone/verify-otp", { method: "POST", body: { code: new FormData(e.currentTarget).get("code") } });
            qc.setQueryData(["me"], updated);
            toast("success", "Phone number verified");
          } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
        }}>
          <p className="text-sm text-muted">We sent a 6 digit code to {sentTo}.</p>
          {devCode && <p className="rounded-md bg-info-50 px-3 py-2 text-xs text-info-700">Development mode, no SMS provider: your code is <strong>{devCode}</strong></p>}
          <FormError message={error} />
          <Field label="Verification code" htmlFor="code"><Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required className="max-w-40 tracking-widest" /></Field>
          <div className="flex items-center gap-3"><Button type="submit" loading={busy}>Verify</Button><Button type="button" variant="ghost" onClick={send} disabled={busy}>Resend code</Button></div>
        </form>
      )}
      {step === "idle" && <FormError message={error} />}
    </CardBody></Card>
  );
}

function AlertsCard({ user }: { user: User }) {
  const qc = useQueryClient();
  const toast = useToast();
  const settings = useGet<Settings>("/settings/public", ["settings", "public"]);
  const f = settings.data?.features;
  const prefs = { email: true, push: true, whatsapp: false, ...user.notifyPrefs };
  const [browserOn, setBrowserOn] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { isPushOn().then(setBrowserOn).catch(() => {}); }, []);

  async function save(patch: Partial<typeof prefs>, key: string) {
    setBusy(key);
    try {
      const { user: updated } = await api<{ user: User }>("/auth/preferences", { method: "PATCH", body: patch });
      qc.setQueryData(["me"], updated);
    } catch (e) { toast("error", errorText(e)); } finally { setBusy(null); }
  }
  async function toggleBrowser(on: boolean) {
    setBusy("browser");
    try {
      if (on) { if (!f?.pushPublicKey) throw new Error("Browser notifications are not set up on this site yet"); await enablePush(f.pushPublicKey); setBrowserOn(true); toast("success", "Browser notifications are on for this device"); }
      else { await disablePush(); setBrowserOn(false); }
    } catch (e) { toast("error", errorText(e)); } finally { setBusy(null); }
  }

  const row = (title: string, text: string, control: React.ReactNode) => (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"><div><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted">{text}</p></div>{control}</div>
  );
  const toggle = (checked: boolean, onChange: (v: boolean) => void, label: string, disabled?: boolean) => (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled || busy !== null} onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? "bg-primary" : "bg-border-strong"}`}>
      <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${checked ? "left-[1.375rem]" : "left-0.5"}`} />
    </button>
  );
  return (
    <Card><CardBody>
      <h2 className="font-semibold">Notifications</h2>
      <p className="mb-4 text-xs text-muted">Choose how we reach you. The bell inside the app always works.</p>
      <div className="divide-y divide-border">
        {row("Email", "Bookings, payments, verification and other important events.", toggle(prefs.email, (v) => save({ email: v }, "email"), "Email notifications"))}
        {row("Browser notifications", pushSupported() ? (f?.pushPublicKey ? "Instant alerts on this device, even when the site is closed." : "Not available: the site has no push keys configured yet.") : "Your browser does not support notifications.", toggle(browserOn, toggleBrowser, "Browser notifications", !pushSupported() || !f?.pushPublicKey))}
        {row("WhatsApp", user.phoneVerified ? (f?.whatsapp ? "Booking updates, daily photos, check-ins and emergencies on WhatsApp." : "Not available: WhatsApp is not set up on this site yet.") : "Verify your phone number above to turn this on.", toggle(prefs.whatsapp, (v) => save({ whatsapp: v }, "whatsapp"), "WhatsApp alerts", !user.phoneVerified || !f?.whatsapp))}
      </div>
    </CardBody></Card>
  );
}

function PasswordCard() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Card>
      <CardBody>
        <h2 className="font-semibold">Change password</h2>
        <p className="text-xs text-muted">Changing your password signs you out of all other devices.</p>
        <form
          className="mt-4 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const d = new FormData(form);
            if (d.get("newPassword") !== d.get("confirm")) return setError("The new passwords do not match");
            setBusy(true);
            setError("");
            try {
              await api("/auth/change-password", { method: "POST", body: { currentPassword: d.get("currentPassword"), newPassword: d.get("newPassword") } });
              form.reset();
              toast("success", "Password changed");
            } catch (err) {
              setError(errorText(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <FormError message={error} />
          <Field label="Current password" htmlFor="currentPassword"><Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="New password" htmlFor="newPassword" hint="At least 8 characters"><Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={8} /></Field>
            <Field label="Confirm new password" htmlFor="confirm"><Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} /></Field>
          </div>
          <Button type="submit" loading={busy}>Update password</Button>
        </form>
      </CardBody>
    </Card>
  );
}

function DangerCard() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  return (
    <Card className="border-danger-600/30">
      <CardBody className="space-y-4">
        <div>
          <h2 className="font-semibold">Sessions</h2>
          <p className="text-sm text-muted">Lost a device or used a shared computer? Sign out everywhere, including here.</p>
          <Button variant="secondary" className="mt-3" loading={busy} onClick={async () => {
            setBusy(true);
            try { await api("/auth/logout-all", { method: "POST" }); await logout().catch(() => {}); router.push("/login"); } catch (e) { toast("error", errorText(e)); } finally { setBusy(false); }
          }}>Sign out of all devices</Button>
        </div>
        <div className="border-t border-border pt-4">
          <h2 className="font-semibold text-danger-700">Delete account</h2>
          <p className="text-sm text-muted">Your personal details are erased. Past bookings and payments stay on record for accounting. You cannot delete while a booking is active.</p>
          <Button variant="danger" className="mt-3" onClick={() => setOpen(true)}>Delete my account</Button>
        </div>
      </CardBody>
      <Modal open={open} onClose={() => setOpen(false)} title="Delete your account?">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api("/auth/me", { method: "DELETE", body: { password: new FormData(e.currentTarget).get("password") } });
              qc.clear();
              router.push("/");
            } catch (err) {
              setError(errorText(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="text-sm text-muted">This cannot be undone. Enter your password to confirm.</p>
          <FormError message={error} />
          <Field label="Password" htmlFor="del-password"><Input id="del-password" name="password" type="password" required autoComplete="current-password" /></Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="danger" loading={busy}>Delete permanently</Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}

export function AccountSettings() {
  const { user, loading } = useRequireAuth();
  if (loading || !user) return <PageSkeleton />;
  return (
    <div className="space-y-6">
      <ProfileCard user={user} />
      <PhoneCard user={user} />
      <AlertsCard user={user} />
      <PasswordCard />
      <DangerCard />
    </div>
  );
}
