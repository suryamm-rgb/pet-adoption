# Backend: API reference

[← Backend index](README.md)

Base URL `/api`. JSON in and out. Auth is an httpOnly cookie (`token`, 7 days) or an `Authorization: Bearer` header. Errors are `{ "error": "...", "details": [...] }`.

### Public
| Method | Path | Notes |
|---|---|---|
| GET | `/health` | liveness plus database check. `503` when MongoDB is down |
| GET | `/settings/public` | fee %, refund rules, allowed pet types, deadlines |
| GET | `/caretakers` | query: `city, from, to, petType, maxPrice (paise), near=lng,lat,km`, `sort=rating|price_asc|price_desc|newest`. Approved caretakers only, and only those with free capacity for the dates |
| GET | `/caretakers/:id`, `/caretakers/:id/reviews` | public profile, no address |
| GET | `/listings` | approved listings, `mode, city, petType` |
| GET | `/listings/:id` | approved or reserved |
| GET | `/products`, `/products/:id` | active products |
| POST | `/cart` | prices a cart from the database |

### Auth
`POST /auth/register`, `/auth/login`, `/auth/logout`, `GET /auth/me`, `POST /auth/verify-email`, `/auth/resend-verification`, `/auth/forgot-password`, `/auth/reset-password`, `POST /auth/roles` (add `caretaker` or `seller`). Account: `PATCH /auth/me` (name, phone, city), `POST /auth/change-password` (signs out other devices), `POST /auth/logout-all`, `DELETE /auth/me` (password required, anonymises). **The first account created on an empty database automatically gets the `admin` role** (bootstrap). Later accounts cannot become admin through the API. Login, register and password routes are rate limited.

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
`GET/PUT /caretakers/me/profile` (also `blockedDates` and `bankDetails`), `POST /caretakers/me/documents/:kind` (`idProof`, `addressProof`, `photos`), `POST /caretakers/me/submit`, `GET /caretakers/me/earnings`, `GET /caretakers/me/requests?status=A,B`, `PATCH /bookings/:id/accept|reject`, `PATCH /bookings/:id/instructions/:iid/ack`, `POST /bookings/:id/updates` (multipart `note` + `files`), `POST /bookings/:id/emergency`.

### Both parties
`GET /bookings/mine?as=owner|caretaker`, `GET /bookings/:id`, `PATCH /bookings/:id/cancel`, `GET|POST /bookings/:id/messages`, `GET /bookings/:id/updates`, `POST /bookings/:id/reviews`, `POST /bookings/:id/disputes`, `GET /bookings/reviews/mine`. Admins can read but not post messages.

### Phone, alerts, Google, push, check-ins, payouts
`POST /auth/phone/send-otp`, `POST /auth/phone/verify-otp` `{code}`, `PATCH /auth/preferences` `{email?, push?, whatsapp?}` (WhatsApp needs a verified phone), `POST /auth/google` `{credential, role?}`, `POST /auth/push/subscribe` and `/auth/push/unsubscribe`, `POST|GET /bookings/:id/checkins` (post: caretaker of an in-care booking, 3 per minute; read: the parties and admins), `POST /caretakers/me/payout-account` `{pan, address}` (Route onboarding), `POST /admin/payouts/:bookingId` `{force?, manual?}`. `GET /settings/public` also returns `features` (Google client id, push public key, sms/whatsapp availability, payout mode) so the website shows only what is configured.

### Files, reviews and reports
`GET /files/private/:key` (login required, access checked, see [private documents](../flows/11-private-documents.md)), `POST /reviews/:id/reply` (only the reviewed person, once), `POST /reports` `{targetType: review|listing|product|message|user, targetId, reason, details}`.

### Payments and webhook
`POST /payments/shop/:orderId`, `POST /payments/sale/:listingId`, `POST /payments/:id/refund` (admin), `POST /payments/mock-complete` (development mock mode only), `POST /api/webhooks/razorpay` (raw body, signature checked).

### Listings, shop, notifications
`POST /listings`, `GET /listings/mine`, `POST /listings/:id/requests`, `GET /listings/requests/incoming|mine`, `PATCH /listings/requests/:id/status`, `POST /listings/:id/handover`, `GET|POST /listings/:id/messages`, `POST /listings/:id/photos`; `POST|PUT /products`, `POST /products/:id/images`, `POST /orders`, `GET /orders/mine`, `GET /orders/seller` (orders containing the seller's products), `GET /orders` (admin), `PATCH /orders/:id/status` (admin, or the seller of an item in the order; `SHIPPED` needs `courier` and `trackingNumber`), `PATCH /orders/:id/cancel` (buyer, seller or admin; refunds and restocks paid orders); `GET /notifications`, `PATCH /notifications/read-all`, `PATCH /notifications/:id/read`.

### Admin (role `admin`)
`GET /admin/stats`, `/admin/verifications?status=`, `PATCH /admin/caretakers/:id/verify`, `GET /admin/users`, `PATCH /admin/users/:id/block`, `GET /admin/bookings`, `/admin/disputes`, `PATCH /admin/disputes/:id/resolve`, `GET /admin/payments`, `/admin/payouts/pending`, `POST /admin/payouts/:bookingId`, `GET|PUT /admin/settings`, `GET /admin/listings/pending`, `PATCH /admin/listings/:id/approve|reject`, `GET /admin/audit?action=`, `GET /admin/reports?status=`, `PATCH /admin/reports/:id` `{action: dismiss|remove|block_user}`. Lists (`users`, `bookings`, `payments`, `audit`) accept `?page=&limit=` (default 50, max 100). `/admin/payouts/pending` includes each caretaker's bank details. Every admin action writes an audit log row.
