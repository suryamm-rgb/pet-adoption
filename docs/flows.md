# End-to-end flows

How the screens, API calls and background jobs fit together. Paths are API paths under `/api`. For the product rules see [pet-care-platform-plan.md](pet-care-platform-plan.md).

## 1. Sign up and verification

1. `/register` → `POST /auth/register` (role `owner` or `caretaker`). Sets the session cookie. If the database has no users yet, this first account also gets the `admin` role.
2. Owners can use the app straight away. In development email is auto-verified; otherwise a link is logged and `POST /auth/verify-email` confirms it. Booking requires a verified email.
3. A caretaker lands on `/caretaker/profile`:
   - `PUT /caretakers/me/profile` (bio, price per day, pet types, max pets, address)
   - `POST /caretakers/me/documents/idProof|addressProof|photos`
   - `POST /caretakers/me/submit` → status `pending`
4. Admin opens `/admin/verifications` → `PATCH /admin/caretakers/:id/verify` (approve, or reject with a reason). The caretaker is notified. Only `approved` profiles appear in search and can accept bookings. A rejected caretaker re-uploads and resubmits.

## 2. Pet profile

`/owner/pets/new` → `POST /pets`, then `POST /pets/:id/vaccination`.

- Edit any field while no booking is locked. With an `ACCEPTED/PAID/IN_CARE` booking only care fields can change (allergies, medicines, food, routine, behaviour, vet, contacts). Each change is logged in `petupdates` and becomes an **instruction** the caretaker must acknowledge.
- A vaccination document is required before a booking can be requested.
- At acceptance a `petSnapshot` is copied into the booking.

## 3. Booking, payment and stay

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

Money for the example in the plan: Rs 500 x 6 days = Rs 3,000; 10% fee = Rs 300; owner pays Rs 3,300; caretaker receives Rs 3,000; platform keeps Rs 300.

## 4. Cancellation and refunds

`PATCH /bookings/:id/cancel`. Allowed from `REQUESTED` (owner), `ACCEPTED`, `PAID`.

| Who and when | Refund |
|---|---|
| Owner, 48 h or more before start | 100% of what was paid, fee included |
| Owner, 24 to 48 h | 50% of the care amount |
| Owner, under 24 h | nothing |
| Caretaker, any time | 100% |
| Admin | 100% |

Tiers are editable in admin Settings. The cancel dialog previews the amount. Refunds go to Razorpay and are stored in `payments.refunds`; `refund.processed` webhooks are applied once. If a payment lands after the booking was cancelled or expired, it is refunded automatically.

## 5. Disputes

1. Owner or caretaker: `POST /bookings/:id/disputes` (reason, photos) during the stay or the dispute window. Booking becomes `DISPUTED` and payout is frozen.
2. Admin reads the booking, chat (read only), updates and pet snapshot at `/admin/bookings/:id`.
3. `PATCH /admin/disputes/:id/resolve` with `full_payout`, `full_refund` or `partial` (amounts to owner and caretaker, total at most what was paid). Booking ends `COMPLETED` or `REFUNDED`, both parties are notified, and the action is audit logged.

## 6. Adoption (Version 2)

1. Seller: `POST /listings` (mode `adopt`) → `pending`. Admin approves at `/admin/listings`.
2. Visitor opens `/listings/:id` → `POST /listings/:id/requests`. They can chat with the lister.
3. Lister: `PATCH /listings/requests/:id/status` → `approved` (listing `reserved`) → `completed` (listing `closed`, linked pet moves to the adopter).

## 7. Buying a pet (Version 2)

1. Seller lists with `mode: sell` and a price; admin approves.
2. Buyer: `POST /payments/sale/:id` → pay → listing `reserved`, money held.
3. After handover the buyer confirms: `POST /listings/:id/handover` → `closed`.

## 8. Pet shop (Version 2)

`/shop` → cart in the browser → `POST /cart` (server prices it) → `/shop/cart` checkout: `POST /orders` (`PENDING_PAYMENT`) → `POST /payments/shop/:orderId` → payment captured → `PLACED`, stock reduced. Admin or seller moves it `PACKED → SHIPPED → DELIVERED` (steps cannot be skipped).

## 9. Notifications

Created by services for: request, accept, reject, payment, stay start, daily update, instruction, message, emergency, completion, payout, refund or cancellation, verification result, dispute, listing and adoption updates. Delivered in-app (bell, live via Socket.io, polling fallback). Email and SMS are not connected.

## 10. Booking status reference

| From | Event | To |
|---|---|---|
| REQUESTED | caretaker accepts | ACCEPTED |
| REQUESTED | caretaker rejects | REJECTED |
| REQUESTED | 24 h timeout | EXPIRED |
| ACCEPTED | payment captured | PAID |
| ACCEPTED | 12 h timeout, or cancel | CANCELLED |
| PAID | start date reached | IN_CARE |
| PAID | cancel | CANCELLED (refund by policy) |
| IN_CARE | owner confirms return, or auto 24 h after end | COMPLETED |
| IN_CARE or COMPLETED (in window) | dispute raised | DISPUTED |
| DISPUTED | admin decision | COMPLETED or REFUNDED |
