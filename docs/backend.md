# Backend

Express 4 + MongoDB (Mongoose 9), ES modules, in `server/`. Money is always **integer paise**.

## Folder structure

```
server/
|-- app.js            builds the Express app (helmet, cors, rate limit, raw webhook route, routes)
|-- server.js         connects Mongo, starts HTTP, Socket.io and cron jobs
|-- seed.js           demo users, caretakers and products
|-- config/           env.js, db.js, razorpay.js (mock mode), cloudinary.js
|-- models/           one file per collection + index.js (re-exports) + helpers.js
|-- routes/           URL + middleware wiring only (authRoutes.js, bookingRoutes.js, ...)
|-- controllers/      thin: read req, call a service, send res
|-- services/         all business rules (booking, payment, pricing helpers, refunds, payouts)
|-- middleware/       auth, validate (zod), sanitize, upload, error
|-- jobs/index.js     cron jobs
|-- sockets/index.js  chat and notification rooms
|-- utils/            money.js (pricing and refund maths), schemas.js (zod), http.js (errors)
`-- tests/            node:test integration tests (real MongoDB, throwaway databases)
```

Rule: controllers stay thin. Price, refund and status rules live in `services/` and `utils/money.js`.

## Running

```bash
cd server
cp .env.example .env
pnpm install
pnpm seed         # demo data
pnpm dev          # http://localhost:5001
pnpm test         # 18 tests
```

| Variable | Purpose |
|---|---|
| `PORT` | default 5001 (macOS uses 5000 for AirPlay) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | required in production |
| `CLIENT_URL` | allowed CORS origin, default `http://localhost:3000` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | real payments. Leave empty in development for mock mode |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | optional. Otherwise files go to `server/uploads` |
| `AUTO_VERIFY_EMAIL` | development only. Set `false` to test the verification link flow |

## Collections

`users`, `caretakerprofiles`, `pets`, `petupdates`, `bookings`, `payments`, `dailyupdates`, `messages`, `reviews`, `disputes`, `listings`, `adoptionrequests`, `products`, `orders`, `notifications`, `auditlogs`, `settings`. Fields follow section 7 of the plan, with these additions: `bookings.acceptedAt/completedAt/payoutStatus`, `payments.listingId`, `listings.buyerId/title/petType/photos`, `settings.disputeWindowHours`.

Indexes: `users.location` 2dsphere (sparse), `bookings {caretakerId,startDate,endDate}` and `{ownerId,status}`, unique sparse `payments.razorpayOrderId` and `razorpayPaymentId`, `messages {bookingId,createdAt}`, unique `reviews {bookingId,fromUserId}`.

## API

Base URL `/api`. JSON in and out. Auth is an httpOnly cookie (`token`, 7 days) or an `Authorization: Bearer` header. Errors are `{ "error": "...", "details": [...] }`.

### Public
| Method | Path | Notes |
|---|---|---|
| GET | `/health` | liveness |
| GET | `/settings/public` | fee %, refund rules, allowed pet types, deadlines |
| GET | `/caretakers` | query: `city, from, to, petType, maxPrice (paise), near=lng,lat,km`. Approved caretakers only, and only those with free capacity for the dates |
| GET | `/caretakers/:id`, `/caretakers/:id/reviews` | public profile, no address |
| GET | `/listings` | approved listings, `mode, city, petType` |
| GET | `/listings/:id` | approved or reserved |
| GET | `/products`, `/products/:id` | active products |
| POST | `/cart` | prices a cart from the database |

### Auth
`POST /auth/register`, `/auth/login`, `/auth/logout`, `GET /auth/me`, `POST /auth/verify-email`, `/auth/forgot-password`, `/auth/reset-password`, `POST /auth/roles` (add `caretaker` or `seller`). **The first account created on an empty database automatically gets the `admin` role** (bootstrap). Later accounts cannot become admin through the API. Login, register and password routes are rate limited.

### Owner
| Method | Path | Notes |
|---|---|---|
| POST, GET | `/pets`, `/pets/mine` | |
| GET, PUT, DELETE | `/pets/:id` | PUT during an active booking only allows care fields and creates instructions |
| GET | `/pets/:id/history` | change log |
| POST | `/pets/:id/vaccination`, `/pets/:id/photos` | multipart `files` |
| POST | `/bookings` | `{caretakerId, petId, startDate, endDate}` |
| PATCH | `/bookings/:id/complete` | "pet received safely" |
| POST | `/bookings/:id/instructions` | |
| POST | `/payments/order`, `/payments/verify` | start and confirm payment |
| GET | `/payments/mine` | |
| GET | `/bookings/:id/invoice` | PDF |

### Caretaker
`GET/PUT /caretakers/me/profile`, `POST /caretakers/me/documents/:kind` (`idProof`, `addressProof`, `photos`), `POST /caretakers/me/submit`, `GET /caretakers/me/earnings`, `GET /caretakers/me/requests?status=A,B`, `PATCH /bookings/:id/accept|reject`, `PATCH /bookings/:id/instructions/:iid/ack`, `POST /bookings/:id/updates` (multipart `note` + `files`), `POST /bookings/:id/emergency`.

### Both parties
`GET /bookings/mine?as=owner|caretaker`, `GET /bookings/:id`, `PATCH /bookings/:id/cancel`, `GET|POST /bookings/:id/messages`, `GET /bookings/:id/updates`, `POST /bookings/:id/reviews`, `POST /bookings/:id/disputes`, `GET /bookings/reviews/mine`. Admins can read but not post messages.

### Payments and webhook
`POST /payments/shop/:orderId`, `POST /payments/sale/:listingId`, `POST /payments/:id/refund` (admin), `POST /payments/mock-complete` (development mock mode only), `POST /api/webhooks/razorpay` (raw body, signature checked).

### Listings, shop, notifications
`POST /listings`, `GET /listings/mine`, `POST /listings/:id/requests`, `GET /listings/requests/incoming|mine`, `PATCH /listings/requests/:id/status`, `POST /listings/:id/handover`, `GET|POST /listings/:id/messages`, `POST /listings/:id/photos`; `POST|PUT /products`, `POST /products/:id/images`, `POST /orders`, `GET /orders/mine`, `GET /orders` (admin), `PATCH /orders/:id/status`; `GET /notifications`, `PATCH /notifications/read-all`, `PATCH /notifications/:id/read`.

### Admin (role `admin`)
`GET /admin/stats`, `/admin/verifications?status=`, `PATCH /admin/caretakers/:id/verify`, `GET /admin/users`, `PATCH /admin/users/:id/block`, `GET /admin/bookings`, `/admin/disputes`, `PATCH /admin/disputes/:id/resolve`, `GET /admin/payments`, `/admin/payouts/pending`, `POST /admin/payouts/:bookingId`, `GET|PUT /admin/settings`, `GET /admin/listings/pending`, `PATCH /admin/listings/:id/approve|reject`, `GET /admin/audit`. Every admin action writes an audit log row.

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

## Security

bcrypt passwords, JWT in httpOnly cookie, zod validation on every input, Mongo operator stripping (`middleware/sanitize.js`), helmet, strict CORS with credentials, rate limits (global, auth, payments), file type and 5 MB size limits, per-record ownership checks, signature checks on payments and webhooks, audit log for admin actions.

## Real-time

Socket.io authenticates with the same cookie. Rooms: `user:<id>` (notifications, listing chat) and `booking:<id>` (chat, updates; joining checks the user is a party).

## Tests

`pnpm test` runs `tests/flow.test.js` (pricing, refund tiers, auth, caretaker approval, vaccination rule, full booking and payment flow, forged signature, webhook signing and idempotency, double booking, daily update and chat, locked pet fields, review, payout, cancellation refunds, disputes) and `tests/v2.test.js` (listing approval, adoption and ownership transfer, sale with held payment, shop pricing, stock and order steps).

## Known limits

- No email or SMS provider is connected. Verification and reset links are logged to the API console.
- Payouts are an admin action (manual transfer), not Razorpay Route.
- MongoDB transactions are not used. Atomic status updates cover the main races; a replica set would allow transactions later.
- Uploads served from `/uploads` are public by unguessable URL. Use Cloudinary signed URLs for ID documents in production.
