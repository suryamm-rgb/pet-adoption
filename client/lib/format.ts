/** Money is stored as integer paise (Rs 500 = 50000). */
export function formatPaise(paise: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

/** Counts the start day, minimum 1 (plan section 3.4). */
export function countDays(startIso: string, endIso: string): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

export function calcPricing(pricePerDay: number, days: number, feePercent: number) {
  const careAmount = pricePerDay * days;
  const platformFee = Math.round((careAmount * feePercent) / 100);
  return { careAmount, platformFee, ownerPays: careAmount + platformFee };
}

export const rupeesToPaise = (rupees: number | string) => Math.round(Number(rupees) * 100);
export const paiseToRupees = (paise: number) => String(paise / 100);

/** Mirrors the server's refund policy so the cancel dialog can preview the amount. */
export function estimateRefund(
  b: { ownerPays: number; careAmount: number; startDate: string },
  rules: { hoursBefore: number; refundPercent: number }[],
  byCaretaker = false,
  now = Date.now(),
) {
  if (byCaretaker) return b.ownerPays;
  const hours = (new Date(b.startDate).getTime() - now) / 3_600_000;
  const tier = [...rules].sort((a, c) => c.hoursBefore - a.hoursBefore).find((r) => hours >= r.hoursBefore);
  const percent = tier?.refundPercent ?? 0;
  return percent >= 100 ? b.ownerPays : Math.round((b.careAmount * percent) / 100);
}

/** "Other" pets carry a free-text type (e.g. Hamster). Show that instead of the word Other. */
export const petTypeLabel = (type?: string, other?: string) => (type === "Other" && other ? other : type ?? "");
