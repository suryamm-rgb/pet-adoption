/** All money is integer paise. */
export function countDays(start, end) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

export function calcPricing({ pricePerDay, days, feePercent, commissionPercent = 0 }) {
  const careAmount = pricePerDay * days;
  const platformFee = Math.round((careAmount * feePercent) / 100);
  const commission = Math.round((careAmount * commissionPercent) / 100);
  return {
    careAmount,
    platformFee,
    ownerPays: careAmount + platformFee,
    caretakerGets: careAmount - commission,
    platformEarns: platformFee + commission,
  };
}

/** rules: [{ hoursBefore, refundPercent }] sorted any order. Refund is % of care amount (fee refunded with 100% tier). */
export function calcRefund({ booking, rules, now = new Date(), cancelledBy }) {
  if (cancelledBy === "caretaker") return booking.ownerPays;
  const hours = (new Date(booking.startDate).getTime() - now.getTime()) / 3_600_000;
  const tier = [...rules].sort((a, b) => b.hoursBefore - a.hoursBefore).find((r) => hours >= r.hoursBefore);
  const percent = tier ? tier.refundPercent : 0;
  if (percent >= 100) return booking.ownerPays;
  return Math.round((booking.careAmount * percent) / 100);
}
