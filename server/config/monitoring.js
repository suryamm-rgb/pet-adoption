import * as Sentry from "@sentry/node";
import { env } from "./env.js";

/** Error monitoring is on only when SENTRY_DSN is set. Everything else still logs to stdout. */
export const monitoringEnabled = Boolean(process.env.SENTRY_DSN) && env.nodeEnv !== "test";
if (monitoringEnabled) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? env.nodeEnv,
    tracesSampleRate: 0,
    sendDefaultPii: false,
  });
}

/** Never throws. `context` is attached as tags/extra, so keep personal data out of it. */
export function captureError(err, context = {}) {
  if (!monitoringEnabled) return;
  try {
    Sentry.withScope((scope) => {
      if (context.userId) scope.setUser({ id: String(context.userId) });
      scope.setContext("request", { method: context.method, path: context.path, source: context.source });
      Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    });
  } catch {
    /* monitoring must never break the app */
  }
}

export const flushMonitoring = (ms = 2000) => (monitoringEnabled ? Sentry.flush(ms) : Promise.resolve());
