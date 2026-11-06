# PawStay: pet care and adoption platform

Built from [docs/pet-care-platform-plan.md](docs/pet-care-platform-plan.md).

| Doc | What is in it |
|---|---|
| [docs/backend.md](docs/backend.md) | server structure, collections, every API route, business rules, jobs, security |
| [docs/frontend.md](docs/frontend.md) | client structure, design tokens, data and auth, screens by role |
| [docs/flows.md](docs/flows.md) | sign-up, booking, payment, refunds, disputes, adoption, sale and shop, status table |
| [docs/pet-care-platform-plan.md](docs/pet-care-platform-plan.md) | the original plan, with section 20 listing where the build differs |

```
client/   Next.js 16 (App Router) + Tailwind v4 design tokens
server/   Express + MongoDB (Mongoose) REST API, Socket.io, cron jobs
docs/     the project plan
```

## Run it

You need Node 22+, pnpm and a local MongoDB.

```bash
# 1. API (http://localhost:5001)
cd server
cp .env.example .env        # then edit secrets
pnpm install
pnpm seed                   # demo users, caretakers and products
pnpm dev

# 2. Web app (http://localhost:3000)
cd client
pnpm install
echo "NEXT_PUBLIC_API_URL=http://localhost:5001/api" > .env.local
pnpm dev
```

Port 5000 is avoided on purpose: macOS uses it for AirPlay Receiver.

On an empty database the first account you register becomes the admin. Or use the seed logins, password `Password123`:

| Role | Email |
|---|---|
| Admin | admin@pawstay.test |
| Owner and seller | ravi@pawstay.test |
| Caretaker | anita@pawstay.test, imran@pawstay.test, meera@pawstay.test |

## Payments

With no `RAZORPAY_KEY_ID` set (development only) the API runs in **mock mode**: checkout is simulated and signatures use a built-in test secret, so the whole booking flow works without an account. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` to use real Razorpay. Mock mode is disabled when `NODE_ENV=production`.

Payouts to caretakers are admin-triggered (manual bank transfer) in this version, as the plan recommends for v1.

## Other settings

- Uploads go to `server/uploads` unless the `CLOUDINARY_*` variables are set.
- In development new accounts are auto-verified. Set `AUTO_VERIFY_EMAIL=false` to test the verification link flow (links are printed in the API console). There is no email provider wired in yet.
- Platform fee, refund tiers, payment deadline and dispute window are editable in the admin Settings page.

## Tests

```bash
cd server && pnpm test
```

17 tests cover pricing, refund tiers, the full booking flow, webhook idempotency, double-booking, disputes, adoption, sales and the shop. They use separate `pet-platform-test*` databases and drop them afterwards.

## Design tokens

All colours, radii, shadows and fonts live in `client/app/globals.css`. Components use semantic tokens (`bg-surface`, `text-muted`, `bg-primary`) so dark mode and re-branding need no component changes.
