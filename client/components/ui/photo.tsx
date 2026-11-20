"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/** Image with a soft placeholder and an emoji fallback when the source is missing or fails. */
export function Photo({ src, alt = "", fallback = "🐾", className }: { src?: string; alt?: string; fallback?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={cn("flex items-center justify-center bg-gradient-to-br from-brand-100 to-accent-100 text-5xl", className)} role={alt ? "img" : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}>
        {fallback}
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={cn("bg-surface-muted object-cover", className)} />;
}
