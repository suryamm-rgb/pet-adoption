# 5. Disputes and reviews

[← Cancellation and refunds](04-cancellation-and-refunds.md) · [Adoption →](06-adoption.md)

**Who:** owner, caretaker, admin

1. Owner or caretaker: `POST /bookings/:id/disputes` (reason, photos) during the stay or the dispute window. Booking becomes `DISPUTED` and payout is frozen.
2. Admin reads the booking, chat (read only), updates and pet snapshot at `/admin/bookings/:id`.
3. `PATCH /admin/disputes/:id/resolve` with `full_payout`, `full_refund` or `partial` (amounts to owner and caretaker, total at most what was paid). Booking ends `COMPLETED` or `REFUNDED`, both parties are notified, and the action is audit logged.

## Reviews and replies

**Activity feed.** The booking page has an **Activity** card: request sent, accepted, every owner instruction (and whether it was read), every daily update with its photo marker, and completion, newest first.

After `COMPLETED` both sides review each other once (`POST /bookings/:id/reviews`). The person reviewed can post **one public reply** (`POST /reviews/:id/reply`; caretakers on `/caretaker/reviews`, owners on `/owner/reviews`) and the reviewer is notified. Only owner-to-caretaker reviews count toward the caretaker's rating. Hidden (moderated) reviews are excluded from the rating and from public lists.
