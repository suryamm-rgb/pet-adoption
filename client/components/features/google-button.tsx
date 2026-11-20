"use client";

import { useEffect, useRef, useState } from "react";
import { errorText } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useGet } from "@/lib/hooks";
import type { Settings, User } from "@/lib/types";

declare global {
  interface Window {
    google?: { accounts: { id: { initialize: (o: Record<string, unknown>) => void; renderButton: (el: HTMLElement, o: Record<string, unknown>) => void } } };
  }
}

const SRC = "https://accounts.google.com/gsi/client";

function loadGsi(): Promise<void> {
  if (window.google?.accounts) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
    const s = existing ?? Object.assign(document.createElement("script"), { src: SRC, async: true, defer: true });
    s.addEventListener("load", () => resolve());
    s.addEventListener("error", () => reject(new Error("Could not load Google sign-in")));
    if (!existing) document.head.appendChild(s);
  });
}

/** "Continue with Google". Renders nothing until the server reports a Google client id, so it is safe to place anywhere. */
export function GoogleButton({ role = "owner", onSuccess, onError }: { role?: "owner" | "caretaker"; onSuccess: (u: User) => void; onError: (m: string) => void }) {
  const settings = useGet<Settings>("/settings/public", ["settings", "public"]);
  const clientId = settings.data?.features?.googleClientId;
  const { googleLogin } = useAuth();
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const latest = useRef({ role, onSuccess, onError, googleLogin });
  useEffect(() => { latest.current = { role, onSuccess, onError, googleLogin }; });

  useEffect(() => {
    if (!clientId || !box.current) return;
    let cancelled = false;
    loadGsi().then(() => {
      if (cancelled || !box.current || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (resp: { credential: string }) => {
          try { latest.current.onSuccess(await latest.current.googleLogin(resp.credential, latest.current.role)); } catch (e) { latest.current.onError(errorText(e)); }
        },
      });
      window.google.accounts.id.renderButton(box.current, { theme: "outline", size: "large", width: Math.min(box.current.clientWidth || 320, 400), text: "continue_with", shape: "rectangular" });
    }).catch(() => setFailed(true));
    return () => { cancelled = true; };
  }, [clientId]);

  if (!clientId || failed) return null;
  return (
    <div className="space-y-4">
      <div ref={box} className="flex min-h-11 justify-center" aria-label="Continue with Google" />
      <div className="flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-border" />or with email<span className="h-px flex-1 bg-border" /></div>
    </div>
  );
}
