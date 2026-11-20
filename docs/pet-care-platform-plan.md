# Pet Care & Adoption Platform: Complete Project Plan

A marketplace where pet owners leave their pets with verified caretakers while travelling, pay per day through the platform, and the platform keeps a fee. The same platform also supports permanent adoption, buying and selling pets, and a pet supplies shop.

> **Implementation status:** Version 1 and Version 2 are built. See [backend/](backend/README.md), [frontend/](frontend/README.md) and [flows/](flows/README.md) for how it works, and the [README](../README.md) to run it. The checklist in section 19 is implemented and covered by `server/tests` (17 tests). The sections below are the original plan; section 20 lists where the build differs from it.

**Example:** Ravi has a dog and must travel for 6 days. He posts a care request. A verified caretaker accepts. Ravi pays online, and the platform holds the money. The caretaker sends daily photo updates. When the dog is returned safely, the platform deducts its fee and pays the caretaker.

---

## 1. Scope

### 1.1 Version 1 (build first, this earns money)
- Sign up, login, roles (owner, caretaker, admin)
- Caretaker profile and admin verification
- Owner pet profiles (add, edit, vaccination upload)
- Temporary care: request, accept, booking
- Online payment with platform fee (Razorpay)
- Daily updates, chat, reviews
- Cancellation and refund rules
- Admin panel: verification, bookings, payments, disputes, fee setting

### 1.2 Version 2 (add after version 1 works)
- Permanent adoption listings and requests
- Buy and sell pets (with admin approval)
- Pet supplies shop (products, cart, orders)

### 1.3 Later ideas
- Mobile app, live location sharing, vet-visit booking, insurance, caretaker subscription plans, SMS and WhatsApp alerts, multi-language support

---

## 2. User Roles and Permissions

| Role | Can do | Cannot do |
|---|---|---|
| **Owner** | Manage own pets, create care requests, book and pay, chat, review, raise disputes, adopt, buy, shop | See other owners' data, accept bookings |
| **Caretaker** | Create profile and set price per day, accept or reject requests, post daily updates, receive payout | Edit pet profiles, change prices of confirmed bookings |
| **Seller / Shelter** | List pets for adoption or sale, sell products | List without admin approval |
| **Admin** | Verify users, approve listings, set fee %, resolve disputes, release or refund payments, view revenue, block users | Edit a user's private chat |

One user can hold more than one role (for example, an owner who is also a caretaker). Store roles as an array on the user.

---

## 3. End-to-End Flows

### 3.1 Registration and verification

```
User signs up (email + phone + password + role)
        |
Email OTP / link verification  ---> verified = true
        |
   Role = Owner?  -----> can use the platform immediately
        |
   Role = Caretaker? --> fills profile + uploads ID proof + address proof
        |
Admin reviews documents --> Approve (verifiedCaretaker = true) / Reject (with reason)
        |
Caretaker becomes visible in search only after approval
```

**Rules**
- Passwords hashed with bcrypt, never stored in plain text.
- A caretaker who is not approved cannot accept bookings and does not appear in search.
- Rejected users see the reason and can upload new documents.

### 3.2 Pet profile creation and updates

```
Owner > My Pets > Add pet
   |-- Basic: name, type, breed, age, gender, weight, photos
   |-- Health: vaccination certificate (upload), allergies, medicines, vet contact
   |-- Care: food type and timing, walk routine, sleeping place
   |-- Behaviour: kids, other pets, noise fear, biting history
   '-- Emergency: owner phone while travelling + backup contact
        |
   Saved in pets collection
```

**Update rules**
1. The owner can edit a pet profile any time when no booking is active.
2. When a booking is confirmed, a **snapshot** of the pet details is copied into the booking (`petSnapshot`). The caretaker always sees what was agreed.
3. If the owner edits health or behaviour fields during an active booking, the change is saved as a **new instruction**. The caretaker is notified and must tap "I have read this".
4. Every change is logged in `petUpdates` (who, what, when).
5. A vaccination certificate is required before a booking can be confirmed.

### 3.3 Temporary care booking (core flow)

```
Owner searches caretakers (city, dates, pet type, price)
        |
Opens caretaker profile (price/day, photos, reviews, home type)
        |
Selects pet + start date + end date  --> price shown (days x price + fee)
        |
Sends booking request  [status: REQUESTED]
        |
Caretaker accepts / rejects (within 24 hours or auto-expire)
        |
   Accepted [status: ACCEPTED] --> Owner has 12 hours to pay
        |
Owner pays online [status: PAID] --> money held by platform
        |
Start date arrives [status: IN_CARE]
        |      Caretaker posts daily photo update + owner can chat
        |
End date: pet handed back --> Owner taps "Pet received safely"
        |
[status: COMPLETED] --> payout scheduled to caretaker
        |
Both sides leave reviews
```

**Booking status machine**

| From | Event | To |
|---|---|---|
| REQUESTED | caretaker accepts | ACCEPTED |
| REQUESTED | caretaker rejects / 24h timeout | REJECTED / EXPIRED |
| ACCEPTED | payment captured | PAID |
| ACCEPTED | 12h payment timeout / owner cancels | CANCELLED |
| PAID | start date reached | IN_CARE |
| PAID | cancelled before start | CANCELLED (refund by policy) |
| IN_CARE | owner confirms return (or auto after end date + 24h) | COMPLETED |
| IN_CARE | dispute raised | DISPUTED |
| DISPUTED | admin decision | COMPLETED or REFUNDED |

### 3.4 Payment, fee and payout

**Calculation**

```
days            = (endDate - startDate) in days  (count start day, minimum 1)
careAmount      = pricePerDay x days
platformFee     = careAmount x feePercent / 100
ownerPays       = careAmount + platformFee
caretakerGets   = careAmount - caretakerCommission   (commission optional, can be 0)
platformEarns   = platformFee + caretakerCommission
```

All amounts are stored as **integers in paise** (Rs 500 = 50000) to avoid decimal errors.

**Example:** Rs 500/day for 6 days = Rs 3,000. With a 10% owner-side fee, the owner pays Rs 3,300, the caretaker gets Rs 3,000, and the platform earns Rs 300.

**Payment steps**
1. Owner clicks Pay. The backend creates a **Razorpay order** for `ownerPays` and saves a `payments` record with status `created`.
2. The frontend opens Razorpay Checkout (UPI, card, net banking).
3. After payment, the frontend sends `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature` to the backend.
4. The backend **verifies the signature** (HMAC SHA256 of `order_id|payment_id` with the key secret) and marks the payment `captured`, and the booking `PAID`.
5. The **webhook** (`payment.captured`, `payment.failed`, `refund.processed`) is the source of truth. It also fixes the status if the browser closed before step 3.
6. After the booking is `COMPLETED`, a payout job transfers `caretakerGets` to the caretaker (Razorpay Route linked account, or a manual bank payout for early versions).
7. The platform fee stays in the platform account.

**Cancellation and refund policy (example, change in settings)**

| When cancelled | Refund to owner |
|---|---|
| 48+ hours before start | 100% of care amount (fee refunded too) |
| 24 to 48 hours before | 50% of care amount |
| Less than 24 hours or after start | 0% (days not used can be refunded at admin discretion) |
| Caretaker cancels | 100% refund plus owner is shown alternative caretakers |

### 3.5 During the stay
- The caretaker uploads at least one **daily update** (photo plus note). The system reminds them if none is posted by evening.
- Owner and caretaker chat inside the booking (Socket.io).
- Owner can add new instructions (see 3.2). The caretaker acknowledges them.
- Emergency button: the caretaker taps "Emergency", and the owner and admin are notified with the pet's vet contact.

### 3.6 Dispute flow

```
Owner or caretaker raises dispute (reason + photos)
        |
Booking status = DISPUTED, payout is frozen
        |
Admin reads chat + daily updates + pet snapshot
        |
Decision: full payout / partial refund / full refund
        |
Admin records decision --> payment adjusted --> booking closed
```

### 3.7 Permanent adoption (Version 2)

```
Owner / shelter creates listing (mode = adopt) --> Admin approves
        |
Adopter browses, opens pet page, sends adoption request with message
        |
Lister reviews request --> approve / reject
        |
Approved: chat opens, meeting arranged, optional adoption fee paid online
        |
Handover confirmed by both --> listing status = adopted, pet ownership transferred
```

### 3.8 Buy and sell pets (Version 2)

```
Seller creates listing (mode = sell, price, photos, documents)
        |
Admin approves (checks documents, species rules, city rules)
        |
Buyer enquires via chat or buys online
        |
Payment held by platform --> seller ships/hands over --> buyer confirms
        |
Platform fee deducted --> seller paid --> listing = sold
```

### 3.9 Pet shop (Version 2)

```
Browse products --> add to cart --> address --> Razorpay payment
        |
Order status: PLACED > PACKED > SHIPPED > DELIVERED
        |
Return / refund window, then seller payout (if multi-vendor) minus commission
```

### 3.10 Admin flow
- Dashboard: bookings today, active stays, revenue, pending verifications, open disputes
- Verification queue: approve or reject caretakers, with reason
- Listing queue: approve or reject adoption, sale and product listings
- Payments: view all payments, run or retry payouts, process refunds
- Settings: platform fee %, cancellation rules, payment deadline, allowed pet types
- User management: block, unblock, view history

---

## 4. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | **Next.js** (App Router) + **React** | Pages, routing, server-side rendering for SEO pages |
| Styling | **Tailwind CSS** | Fast responsive UI (mobile-first) |
| Forms / validation (client) | **React Hook Form** + **Zod** | Forms with validation |
| Data fetching | **TanStack Query** (or SWR) | Caching, loading and error states |
| Backend | **Node.js** + **Express** | REST API |
| Database | **MongoDB** + **Mongoose** | Storage, geo queries for "caretakers near me" |
| Auth | **JWT** (httpOnly cookie) + **bcrypt** | Login and role checks |
| Validation (server) | **Zod** | Reject bad input early |
| Payments | **Razorpay** (Orders, Checkout, Webhooks, Refunds, Route) | Online payment, refunds, payouts |
| File storage | **Cloudinary** (or AWS S3) | Pet photos, documents, daily updates |
| Real-time | **Socket.io** | Chat and live notifications |
| Email | **Nodemailer** (or Resend) | Verification, receipts, alerts |
| SMS / OTP | Twilio or MSG91 | Phone OTP, urgent alerts |
| Background jobs | **node-cron** (later **BullMQ + Redis** if jobs grow) | Reminders, expiry, payouts, auto-complete |
| PDF | **pdfkit** | Invoices and receipts |
| Security | **helmet**, **express-rate-limit**, **cors**, **express-mongo-sanitize** | Hardening |
| Logging | **winston** or **pino** | Error and audit logs |
| Testing | **Jest**, **Supertest**, **Playwright** | Unit, API and end-to-end tests |
| Hosting | **Vercel** (frontend), **Render / Railway** (API), **MongoDB Atlas** | Deployment |

**Why this stack:** one language (JavaScript) across the whole project, large community, MongoDB suits flexible pet and listing data, and Razorpay fits UPI payments in India.

**Money safety with MongoDB:** store money as integers in paise, use MongoDB **transactions** when a booking and its payment change together, and never edit payment records (add new records instead).

---

## 5. System Architecture

```
 Browser (Next.js)
     |  HTTPS (REST + cookies)          WebSocket (Socket.io)
     v                                          |
 Express API  <-----------------------------------'
  |-- auth / roles middleware
  |-- controllers + services (booking, payment, pet, listing, shop)
  |-- Razorpay SDK -----> Razorpay  --webhook--> /api/webhooks/razorpay
  |-- Cloudinary SDK ---> image/doc storage
  |-- Nodemailer / SMS --> email + OTP
  |-- node-cron jobs (expiry, reminders, payouts)
  v
 MongoDB Atlas
```

---

## 6. Folder Structure

```
pet-adoption/                    (repository root, holds docs/)
|-- client/                      (Next.js)
|   |-- app/
|   |   |-- (public)/            home, caretakers, adopt, pets-for-sale, listings, shop, auth pages, legal
|   |   |-- owner/               pets, bookings, payments, reviews, adoptions, orders
|   |   |-- caretaker/           profile, requests, stays, calendar, earnings
|   |   |-- seller/              listings, requests, products
|   |   |-- admin/               dashboard, verifications, listings, bookings, payments, disputes, users, settings, orders
|   |-- components/              UI pieces (PetCard, BookingForm, Chat, UpdateFeed)
|   |-- lib/                     api client, auth helper, socket client
|   '-- .env.local
|
'-- server/                      (Express)
    |-- config/                  db.js, razorpay.js, cloudinary.js, env.js
    |-- models/                  User, CaretakerProfile, Pet, Booking, Payment, ...
    |-- routes/                  auth, pets, caretakers, bookings, payments, ...
    |-- controllers/             request handling only
    |-- services/                business logic (pricing, booking state, payout)
    |-- middleware/              auth, role, validate, upload, error
    |-- jobs/                    expireBookings, reminders, autoComplete, payouts
    |-- sockets/                 chat and notification handlers
    |-- utils/                   helpers (money, dates, email templates)
    |-- app.js
    |-- server.js
    '-- seed.js, tests/
```

Rule: controllers stay thin; all business rules (price, refund, status changes) live in `services/`.

---

## 7. Database Design (MongoDB collections)

### users
`name, email (unique), phone, passwordHash, roles[] (owner|caretaker|seller|admin), city, location {type:Point, coordinates}, emailVerified, phoneVerified, isBlocked, createdAt`

### caretakerProfiles
`userId, bio, pricePerDay (paise), maxPets, acceptedPetTypes[], homeType, hasGarden, experienceYears, photos[], idProofUrl, addressProofUrl, verificationStatus (pending|approved|rejected), rejectionReason, ratingAvg, ratingCount, bankDetails/razorpayLinkedAccountId`

### pets
`ownerId, name, type, breed, age, gender, weight, photos[], vaccinationDocs[], allergies, medications[{name,dose,time}], vetName, vetPhone, food{type,schedule}, routine, behaviourNotes, goodWithKids, goodWithPets, emergencyContact{name,phone}, updatedAt`

### petUpdates
`petId, changedBy, changes (old/new), bookingId (optional), createdAt`

### bookings
`ownerId, caretakerId, petId, petSnapshot, startDate, endDate, days, pricePerDay, careAmount, platformFee, ownerPays, caretakerGets, status, cancelledBy, cancelReason, refundAmount, instructions[{text,at,acknowledged}], createdAt`

### payments
`bookingId | orderId, type (booking|shop|adoption|sale), razorpayOrderId, razorpayPaymentId, razorpaySignature, amount, currency, status (created|captured|failed|refunded|partially_refunded), refunds[{id,amount,at}], payout{status,transferId,amount,at}`

### dailyUpdates
`bookingId, caretakerId, note, photos[], createdAt`

### messages
`bookingId | listingId, senderId, receiverId, text, attachments[], readAt, createdAt`

### reviews
`bookingId, fromUserId, toUserId, rating (1-5), comment, createdAt` (one review per side per booking)

### disputes
`bookingId, raisedBy, reason, evidence[], status (open|resolved), adminDecision, amountToOwner, amountToCaretaker, resolvedBy, createdAt`

### listings (Version 2)
`sellerId, petId, mode (adopt|sell), price, description, documents[], city, status (pending|approved|rejected|reserved|closed), createdAt`

### adoptionRequests (Version 2)
`listingId, adopterId, message, status (pending|approved|rejected|completed)`

### products / orders (Version 2)
- products: `sellerId, name, category, price, stock, images[], description, isActive`
- orders: `userId, items[{productId,qty,price}], total, address, status, paymentId, createdAt`

### notifications
`userId, type, title, body, link, readAt, createdAt`

### settings
`platformFeePercent, caretakerCommissionPercent, cancellationRules[], paymentDeadlineHours, requestExpiryHours, allowedPetTypes[]`

**Indexes**
- `users.location` as `2dsphere` (nearby caretakers)
- `bookings` on `{caretakerId, startDate, endDate}` (check clashes) and `{ownerId, status}`
- `payments` on `razorpayOrderId` and `razorpayPaymentId` (unique)
- `messages` on `{bookingId, createdAt}`

**Double-booking protection:** before accepting, check that the caretaker has no `PAID` or `IN_CARE` booking overlapping the dates beyond `maxPets`.

---

## 8. API Endpoints

**Auth:** `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/verify-email`, `POST /auth/forgot-password`, `POST /auth/reset-password`

**Pets:** `POST /pets`, `GET /pets/mine`, `GET /pets/:id`, `PUT /pets/:id`, `DELETE /pets/:id`, `POST /pets/:id/vaccination`

**Caretakers:** `PUT /caretakers/profile`, `GET /caretakers?city=&from=&to=&petType=&maxPrice=&near=`, `GET /caretakers/:id`

**Bookings:** `POST /bookings`, `GET /bookings/mine`, `GET /bookings/:id`, `PATCH /bookings/:id/accept`, `PATCH /bookings/:id/reject`, `PATCH /bookings/:id/cancel`, `PATCH /bookings/:id/complete`, `POST /bookings/:id/instructions`, `PATCH /bookings/:id/instructions/:iid/ack`

**Daily updates:** `POST /bookings/:id/updates`, `GET /bookings/:id/updates`

**Payments:** `POST /payments/order` (create Razorpay order), `POST /payments/verify`, `POST /webhooks/razorpay`, `POST /payments/:id/refund` (admin or system), `GET /payments/mine`

**Chat:** `GET /bookings/:id/messages`, `POST /bookings/:id/messages` (and Socket.io events `message:new`, `typing`, `notification:new`)

**Reviews:** `POST /bookings/:id/reviews`, `GET /caretakers/:id/reviews`

**Disputes:** `POST /bookings/:id/disputes`, `GET /admin/disputes`, `PATCH /admin/disputes/:id/resolve`

**Listings (v2):** `POST /listings`, `GET /listings?mode=adopt|sell`, `GET /listings/:id`, `POST /listings/:id/requests`, `PATCH /requests/:id/status`

**Shop (v2):** `GET /products`, `POST /cart`, `POST /orders`, `GET /orders/mine`, `PATCH /orders/:id/status`

**Admin:** `GET /admin/stats`, `GET /admin/verifications`, `PATCH /admin/caretakers/:id/verify`, `GET /admin/listings/pending`, `PATCH /admin/listings/:id/approve`, `GET/PUT /admin/settings`, `PATCH /admin/users/:id/block`, `POST /admin/payouts/:bookingId`

All routes except public search, login and register require authentication. Role checks happen in middleware, and every query is scoped to the logged-in user (for example, a booking can only be read by its owner, caretaker or an admin).

---

## 9. Frontend Pages

**Public:** Home, Find caretakers (search + filters + map/list), Caretaker detail, Adopt a pet, Pets for sale, Shop, Login, Register, Forgot password

**Owner:** Dashboard, My pets, Add/Edit pet, New booking, My bookings, Booking detail (status, updates feed, chat, instructions), Payments and invoices, Reviews

**Caretaker:** Profile and verification, Booking requests, Active stays (post updates, acknowledge instructions), Earnings and payout history, Availability calendar

**Buyer / Adopter (v2):** Adoption requests, Cart and checkout, My orders

**Admin:** Dashboard, Verification queue, Listing approvals, Bookings, Payments and payouts, Disputes, Users, Settings

**UI rules:** mobile-first, loading and error states on every page, image upload with preview, clear status badges, and confirm dialogs for cancel and payment actions.

---

## 10. Razorpay Integration (step by step)

1. Create a Razorpay account (test mode first) and get `KEY_ID` and `KEY_SECRET`.
2. Backend: `POST /payments/order` calls `razorpay.orders.create({amount, currency: "INR", receipt: bookingId})`.
3. Frontend: load Razorpay Checkout script and open it with the `order_id`.
4. On success, send the three Razorpay values to `POST /payments/verify`. Verify the HMAC signature on the server.
5. Configure a webhook in the Razorpay dashboard pointing to `/api/webhooks/razorpay`. Verify the `X-Razorpay-Signature` header with the webhook secret. Handle `payment.captured`, `payment.failed`, `refund.processed`.
6. Make webhook handling **idempotent** (the same event can arrive twice). Check whether the payment is already updated before changing anything.
7. Refunds: call the Razorpay refund API with the computed refund amount, and store the refund in `payments.refunds`.
8. Payouts: use Razorpay Route (linked accounts) to split funds to caretakers. This needs caretaker KYC and some Razorpay approval, so for the first version keep payouts as an admin-triggered bank transfer, then automate later.
9. Test using Razorpay test cards and UPI in test mode before going live.

Never trust the browser alone for payment success, and never expose `KEY_SECRET` to the frontend.

> Check the current Razorpay documentation for exact API names, Route availability and fees before building, since these can change.

---

## 11. Background Jobs

| Job | Schedule | What it does |
|---|---|---|
| expireRequests | every 15 min | Marks REQUESTED bookings older than 24h as EXPIRED |
| expireUnpaid | every 15 min | Cancels ACCEPTED bookings not paid within 12h |
| startStays | hourly | PAID bookings reaching start date become IN_CARE |
| updateReminder | daily 6 pm | Notifies caretakers who have not posted today's update |
| autoComplete | hourly | Completes IN_CARE bookings 24h after end date if the owner has not responded and no dispute exists |
| payouts | hourly | Pays caretakers for COMPLETED bookings after the dispute window |
| reminders | daily | Emails upcoming-trip reminders to owner and caretaker |

---

## 12. Notifications

Send in-app, email, and optionally SMS for: booking requested, accepted, rejected, payment success or failure, stay started, new daily update, new instruction, emergency, stay completed, payout released, refund processed, verification result, dispute update.

---

## 13. Security Checklist

- Hash passwords (bcrypt), JWT in httpOnly secure cookies, short expiry plus refresh
- Validate every input on the server (Zod), sanitize against NoSQL injection
- Role-based access middleware and per-record ownership checks
- Rate limiting on login, OTP and payment routes
- `helmet`, strict CORS (only your frontend domain), HTTPS only
- Upload limits: file type and size checks; ID documents stored privately with signed URLs
- Show exact addresses only after a booking is confirmed
- Verify payment signatures and webhooks on the server
- Keep secrets in environment variables only (never in Git)
- Audit log for admin actions (verification, refunds, payouts, blocks)
- Regular MongoDB Atlas backups

---

## 14. Environment Variables

```
# server/.env
NODE_ENV=development
PORT=5001
MONGO_URI=
JWT_SECRET=
CLIENT_URL=http://localhost:3000
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
SMS_API_KEY=

# client/.env.local
NEXT_PUBLIC_API_URL=http://localhost:5001/api
NEXT_PUBLIC_RAZORPAY_KEY_ID=
```

---

## 15. Testing Plan

- **Unit tests (Jest):** price and fee calculation, refund rules, booking status transitions
- **API tests (Supertest):** auth, role access, booking creation, double-booking prevention, payment verify and webhook idempotency
- **End-to-end (Playwright):** register, create pet, book, pay with a test card, post update, complete, review
- **Manual checks:** payment failure and retry, cancellation at each refund tier, dispute resolution, upload limits, mobile layout

---

## 16. Deployment

| Part | Service |
|---|---|
| Frontend | Vercel |
| API + Socket.io + jobs | Render or Railway (one always-on service) |
| Database | MongoDB Atlas (start on free tier, upgrade later) |
| Files | Cloudinary |
| Domain + HTTPS | Your domain with the hosts' managed SSL |

Use separate **test** and **live** environments with separate Razorpay keys and databases. Set up error tracking (Sentry) and uptime monitoring.

---

## 17. Build Phases

| Phase | Work | Time (solo) |
|---|---|---|
| 1 | Project setup, auth, roles, email verification | 1 week |
| 2 | Pet profiles and update rules (snapshots, history) | 1 week |
| 3 | Caretaker profile, admin verification, search | 1.5 weeks |
| 4 | Booking flow and status machine, double-booking checks | 1.5 weeks |
| 5 | Razorpay payment, fee logic, webhooks, refunds | 2 weeks |
| 6 | Daily updates, chat, notifications, reviews | 1.5 weeks |
| 7 | Disputes, payouts, admin dashboard, jobs | 1.5 weeks |
| 8 | Testing, security pass, deployment (**Version 1 launch**) | 1 week |
| 9 | Adoption listings and requests | 1.5 weeks |
| 10 | Buy/sell pets with approval and payment | 1.5 weeks |
| 11 | Pet shop (products, cart, orders) | 2 weeks |

Version 1 is about 11 weeks; the full product is about 16 to 17 weeks solo.

---

## 18. Legal, Safety and Risk Notes

- Add Terms and Conditions, Privacy Policy, a care agreement, and a refund policy page.
- Require caretaker ID verification and show a "verified" badge only after approval.
- Require a vaccination certificate before every booking.
- Display emergency vet details on every booking.
- Rules for selling and breeding pets differ by country and state. Check local regulations, restrict listings where required, and keep admin approval on all sale listings. Launch care and adoption first.
- Holding customer money and paying out to others can have legal and tax implications (GST, TDS, marketplace rules). Talk to an accountant or lawyer before going live.
- Protect personal data (addresses, phone numbers, ID proofs) and delete it when no longer needed.

---

## 19. Definition of Done (Version 1)

- [ ] A caretaker can register, upload documents, and be approved by the admin
- [ ] An owner can add a pet with a vaccination certificate and edit it later
- [ ] An owner can book, pay through Razorpay, and see the booking become PAID
- [ ] A caretaker can accept, post daily updates, and chat
- [ ] The platform fee is calculated correctly and shown before payment
- [ ] Cancellation refunds follow the policy
- [ ] Completed bookings trigger payout and both sides can review
- [ ] The admin can verify, resolve disputes, set the fee and see revenue
- [ ] Webhooks are verified and idempotent
- [ ] Deployed with test and live environments, and tested on mobile

---

## 20. Where the build differs from this plan

| Plan | Built | Why |
|---|---|---|
| API on port 5000 | Port 5001 | macOS uses 5000 for AirPlay Receiver |
| Cloudinary or S3 for files | Local `server/uploads` (public photos) and `server/private-uploads` (ID, address, vaccination documents behind an access check). Cloudinary used automatically when its variables are set, with authenticated assets for private files | works with no account |
| Razorpay only | Same, plus a development **mock mode** when no keys are set | lets the full payment flow run without an account. It is off in production |
| Razorpay Route payouts | Admin-triggered manual payout (the plan's own v1 suggestion) | Route needs caretaker KYC and approval |
| MongoDB transactions | Atomic `findOneAndUpdate` status changes, idempotent payment capture | no replica set needed. Add transactions later if desired |
| Email and SMS notifications | In-app notifications (live via Socket.io) plus email through Nodemailer for account events and 19 important notification types. SMS is not connected | SMS needs a provider account. Without `SMTP_HOST` emails are logged in development |
| `express-mongo-sanitize` | Own `middleware/sanitize.js` | the package does not fit Express request objects cleanly |
| Cart endpoint `POST /cart` as stored cart | Cart kept in the browser. `POST /cart` only prices it | prices are never trusted from the client |
| JWT short expiry plus refresh | 7-day httpOnly cookie, no refresh token | simpler. Add refresh tokens before launch if required |
| Email verification required for owners | Verification required to book. Auto-verified in development | easier local testing |
| Pages listed in section 9 | All built, plus seller area, notifications, legal pages | |
| Admin audit log | Built, with an admin screen at `/admin/audit` | |

Added after the first build (all tested): profile and password settings, sign out everywhere, account deletion (anonymises); private ID and vaccination files served only to the owner, an assigned caretaker or an admin (`/api/files/private`); report button plus admin moderation queue; review replies; shop order cancellation with automatic refund and restock, seller order screen, seller isolation; caretaker bank details, blockable availability dates, search sort; paginated admin lists; audit log screen; Nodemailer emails; Dockerfiles, compose, CI, sitemap, robots, manifest, health check, graceful shutdown. See `DEPLOY.md`.

Added later: walk and location check-ins, phone verification by SMS code, WhatsApp alerts and per-user notification preferences, browser push notifications, Google sign-in, and automatic Razorpay Route payouts (these four need provider keys and are written to the providers' documentation; see `DEPLOY.md`).

Still not built: mobile app, continuous live location, vet-visit booking, insurance, subscriptions, multi-language, near-me map search UI.
