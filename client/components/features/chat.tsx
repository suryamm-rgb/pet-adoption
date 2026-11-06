"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { useAction, useGet } from "@/lib/hooks";
import { getSocket } from "@/lib/socket";
import type { Message } from "@/lib/types";

type Props = { bookingId?: string; listingId?: string; withUser?: string; title?: string; readOnly?: boolean };

export function Chat({ bookingId, listingId, withUser, title = "Chat", readOnly }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const base = bookingId ? `/bookings/${bookingId}` : `/listings/${listingId}`;
  const key = ["messages", bookingId ?? listingId, withUser ?? ""];
  const path = `${base}/messages${withUser ? `?with=${withUser}` : ""}`;
  const q = useGet<Message[]>(path, key, { refetchInterval: 20_000 });
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const send = useAction((t: string) => api(`${base}/messages`, { method: "POST", body: { text: t, ...(withUser ? { to: withUser } : {}) } }), { invalidate: [key], onSuccess: () => setText("") });

  useEffect(() => {
    const socket = getSocket();
    const refresh = () => qc.invalidateQueries({ queryKey: key });
    if (bookingId) socket.emit("booking:join", bookingId);
    socket.on("message:new", refresh);
    return () => void socket.off("message:new", refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, qc]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [q.data?.length]);

  return (
    <Card>
      <CardBody>
        <h2 className="font-semibold">{title}</h2>
        <div className="mt-3 h-72 space-y-2 overflow-y-auto rounded-lg bg-surface-muted p-3" role="log" aria-live="polite" aria-label="Messages">
          {q.data?.length ? q.data.map((m) => {
            const mine = m.senderId === user?.id;
            return (
              <div key={m._id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-sm", mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-surface shadow-card")}>
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  <p className={cn("mt-0.5 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted")}>{formatDateTime(m.createdAt)}</p>
                </div>
              </div>
            );
          }) : <p className="pt-24 text-center text-sm text-muted">{q.isPending ? "Loading…" : "No messages yet. Say hello!"}</p>}
          <div ref={endRef} />
        </div>
        {readOnly ? <p className="mt-3 text-xs text-muted">Admins can read this chat but not post.</p> : (
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate(text.trim()); }}>
            <Input aria-label="Message" placeholder="Write a message" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
            <Button type="submit" loading={send.isPending} disabled={!text.trim()}>Send</Button>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
