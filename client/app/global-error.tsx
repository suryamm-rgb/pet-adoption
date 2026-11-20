"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/report-error";

/** Last resort when the root layout itself crashes. Plain HTML: no theme or providers are available here. */
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => reportError(error, "boundary"), [error]);
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, textAlign: "center" }}>
        <div>
          <p style={{ fontSize: 48, margin: 0 }}>😿</p>
          <h1>Something went wrong</h1>
          <p>Please try again. If it keeps happening, contact support.</p>
          <button type="button" onClick={reset} style={{ padding: "10px 20px", borderRadius: 8, border: 0, background: "#c2570c", color: "#fff", fontWeight: 600, cursor: "pointer" }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
