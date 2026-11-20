# 3. Booking, payment and stay

[← Pet profile](02-pet-profile.md) · [Cancellation and refunds →](04-cancellation-and-refunds.md)

**Who:** owner, caretaker

```
Owner                         API / jobs                              Caretaker
-----                         ----------                              ---------
/caretakers/:id
 pick pet + dates
 POST /bookings         ----> REQUESTED  (price = days x price + fee)
                                  | expireRequests after 24 h -> EXPIRED
                                                                  PATCH /bookings/:id/accept (or reject)
                              ACCEPTED  (capacity checked, pet snapshot saved)
                                  | expireUnpaid after 12 h -> CANCELLED
 POST /payments/order   ----> Razorpay order + payment row (created)
 Razorpay Checkout
 POST /payments/verify  ----> signature checked -> captured
 (or webhook payment.captured, same result, idempotent)
                              PAID  (address now visible)
                                  | startStays when start date arrives
                              IN_CARE                                  POST /bookings/:id/updates (daily)
 chat, add instructions  <--- Socket.io + notifications --->           chat, acknowledge, Emergency button
 PATCH /bookings/:id/complete
                              COMPLETED, payout pending
                                  | autoComplete 24 h after end date if owner does nothing
 reviews both ways  (POST /bookings/:id/reviews)
                              dispute window (default 24 h)
 Admin: POST /admin/payouts/:bookingId  -> payout paid
```

**Availability.** On `/caretaker/calendar` a caretaker clicks free future days to mark them unavailable (`blockedDates` on the profile). A booking request or acceptance that touches a blocked day is refused, and the caretaker is left out of search results for date ranges that include one. Booked days show on the same calendar.

Money for the example in the plan: Rs 500 x 6 days = Rs 3,000; 10% fee = Rs 300; owner pays Rs 3,300; caretaker receives Rs 3,000; platform keeps Rs 300.
