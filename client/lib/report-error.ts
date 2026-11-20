import { API_URL } from "./api";

let sent = 0;
const seen = new Set<string>();

/** Sends a browser error to the API (and so to Sentry). Silent, deduplicated, at most 5 per page load. */
export function reportError(error: unknown, source: "boundary" | "window" | "promise" = "window") {
  try {
    const err = error instanceof Error ? error : new Error(typeof error === "string" ? error : "Unknown error");
    const key = `${source}:${err.message}`;
    if (sent >= 5 || seen.has(key)) return;
    seen.add(key);
    sent += 1;
    void fetch(`${API_URL}/client-errors`, {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: err.message.slice(0, 500), stack: err.stack?.slice(0, 4000), url: location.pathname, source }),
    }).catch(() => {});
  } catch {
    /* reporting must never throw */
  }
}
