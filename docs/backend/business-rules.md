# Backend: Business rules, jobs and real-time

[← Backend index](README.md)

## Business rules (where they live)

| Rule | Location |
|---|---|
| Price, fee and refund maths | `utils/money.js` |
| Booking creation checks (verified email, vaccination doc, pet type, capacity, past dates) | `services/bookingService.js` `createBooking` |
| State transitions are atomic (`findOneAndUpdate` with the expected status) | `bookingService.js`, `paymentService.js` |
| Capacity: overlapping `ACCEPTED/PAID/IN_CARE` bookings must be below `maxPets` | `hasCapacity` |
| Payment capture is idempotent. A late payment on a cancelled booking is refunded automatically | `paymentService.markCaptured` |
| Address visible only after `PAID` | `bookingController.get` |
| Payout needs `COMPLETED`, pending status and the dispute window passed (or admin force) | `paymentService.payoutBooking` |
| Blocked dates: a booking request or acceptance touching one is refused, and search skips the caretaker | `bookingService.isBlocked` |
| Order cancellation refunds a paid order in full and restocks | `shopService.cancelOrder` |
| Sellers can only manage orders containing their products | `shopService.assertCanManage` |
| Reports: remove hides a review (rating recalculated), rejects a listing, deactivates a product or masks a message | `reportService.resolveReport` |
| Dispute freezes payout. Admin chooses full payout, partial split or full refund | `bookingService.raiseDispute/resolveDispute` |

## Background jobs

| Job | Schedule | Effect |
|---|---|---|
| expireRequests | every 15 min | `REQUESTED` older than `requestExpiryHours` becomes `EXPIRED` |
| expireUnpaid | every 15 min | `ACCEPTED` older than `paymentDeadlineHours` becomes `CANCELLED` |
| startStays | hourly | `PAID` with start date reached becomes `IN_CARE` |
| updateReminder | daily 18:00 | notifies caretakers with no update today |
| autoComplete | hourly | `IN_CARE` 24 h past end date becomes `COMPLETED` |
| payoutDigest | hourly | counts payouts that became eligible |
| tripReminders | daily 09:00 | reminds both parties about tomorrow's stays |

## Real-time

Socket.io authenticates with the same cookie. Rooms: `user:<id>` (notifications, listing chat) and `booking:<id>` (chat, updates; joining checks the user is a party).
