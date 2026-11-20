/** Normalises a phone number to E.164. Numbers without a country code are treated as Indian (+91). Returns null when it cannot be valid. */
export function toE164(raw, defaultCountry = "91") {
  if (!raw) return null;
  let digits = String(raw).replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.length === 10) digits = defaultCountry + digits;
  else if (digits.length === 11 && digits.startsWith("0")) digits = defaultCountry + digits.slice(1);
  return /^\d{10,15}$/.test(digits) ? `+${digits}` : null;
}
