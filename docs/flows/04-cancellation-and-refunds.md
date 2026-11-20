# 4. Cancellation and refunds

[← Booking, payment and stay](03-booking-payment-and-stay.md) · [Disputes and reviews →](05-disputes-and-reviews.md)

**Who:** owner, caretaker, admin

`PATCH /bookings/:id/cancel`. Allowed from `REQUESTED` (owner), `ACCEPTED`, `PAID`.

| Who and when | Refund |
|---|---|
| Owner, 48 h or more before start | 100% of what was paid, fee included |
| Owner, 24 to 48 h | 50% of the care amount |
| Owner, under 24 h | nothing |
| Caretaker, any time | 100% |
| Admin | 100% |

Tiers are editable in admin Settings. The cancel dialog previews the amount. Refunds go to Razorpay and are stored in `payments.refunds`; `refund.processed` webhooks are applied once. If a payment lands after the booking was cancelled or expired, it is refunded automatically.
