# PawStay: pet care and adoption platform

Built from [docs/pet-care-platform-plan.md](docs/pet-care-platform-plan.md).

| Doc | What is in it |
|---|---|
| [docs/backend/](docs/backend/README.md) | server structure, collections, every API route, business rules, jobs, security |
| [docs/frontend/](docs/frontend/README.md) | client structure, design tokens, data and auth, screens by role |
| [docs/flows/](docs/flows/README.md) | every end-to-end flow: sign-up, account settings, booking, payment, refunds, disputes, reviews, adoption, sale, shop and cancellations, email, private documents, moderation, admin, going live, status table |
| [DEPLOY.md](DEPLOY.md) | step-by-step production deployment and launch checklist |
| [docs/pet-care-platform-plan.md](docs/pet-care-platform-plan.md) | the original plan, with section 20 listing where the build differs |

```
client/   Next.js 16 (App Router) + Tailwind v4 design tokens
server/   Express + MongoDB (Mongoose) REST API, Socket.io, cron jobs, Nodemailer
docs/     flows/ backend/ frontend/ (one page per topic) and the original plan
DEPLOY.md, docker-compose.yml, .github/workflows/ci.yml   production deployment and CI
```

## What the app does

Pet owners book ID-verified caretakers, pay through the platform (money is held until the pet is home), get daily photo updates, chat and review. Caretakers manage requests, availability, earnings and bank details. Sellers and shelters list pets for adoption or sale and sell shop products. Admins verify caretakers, approve listings, decide disputes, release payouts, moderate reports and read the audit log. Everyone has account settings, email notifications and live in-app notifications.

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
cp .env.example .env.local   # NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SITE_URL
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

Payouts to caretakers are admin-triggered (manual bank transfer) in this version, as the plan recommends for v1. Caretakers save their bank account on their profile and the admin payouts screen shows it.

## Other settings

- Photos go to `server/uploads` unless the `CLOUDINARY_*` variables are set. ID, address and vaccination documents are private (`server/private-uploads` or authenticated Cloudinary) and only open for people allowed to see them.
- In development new accounts are auto-verified. Set `AUTO_VERIFY_EMAIL=false` to test the verification link flow.
- **Error monitoring**: set `SENTRY_DSN` (free Sentry project) in `server/.env` and server crashes, API 500s and browser crashes are reported. Without it, errors only go to the log.
- **Phone verification and WhatsApp** (Twilio), **browser notifications** (Web Push), **Google sign-in** and **automatic caretaker payouts** (Razorpay Route) each switch on when their keys are in `server/.env`; see `server/.env.example` and [DEPLOY.md](DEPLOY.md). Without keys the app works: verification codes are shown on screen in development and everything else is simply hidden.
- **Walk and location check-ins**: during a stay the caretaker can share a location on purpose; the owner sees it on an OpenStreetMap map. No account or key needed.
- **Email** uses Nodemailer. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM` in `server/.env` (Gmail app password, Brevo, SendGrid, SES, Mailtrap). With no SMTP host, emails are printed in the API log in development.
- Platform fee, refund tiers, payment deadline and dispute window are editable in the admin Settings page.

## Tests

```bash
cd server && pnpm test
```

41 server tests cover pricing, refund tiers, the full booking flow, webhook idempotency, double-booking, disputes, adoption, sales, the shop, account security, private files, moderation, order cancellation, availability and email. They use separate `pet-platform-test*` databases and drop them afterwards.

```bash
cd client && pnpm exec tsc --noEmit && pnpm lint && pnpm build
```

**End-to-end tests** (Playwright, real browser) cover sign-up and login, profile edit, adding a pet with a vaccination file, booking, caretaker acceptance, mock payment, blocked dates, reporting and moderation, order tracking, phone verification and location check-ins:

```bash
cd client
pnpm e2e            # needs MongoDB running; uses your installed Chrome
pnpm e2e:ui         # watch and debug visually
```

They start their own API (port 5101, database `pet-platform-e2e`, mock payments) and website (port 3101), so your development data is never touched. In CI, `E2E_CHANNEL=chromium` uses Playwright's own browser.

GitHub Actions (`.github/workflows/ci.yml`) runs server tests, type-check, lint, build, the end-to-end tests and Docker builds on every push.

## Deploying

See [DEPLOY.md](DEPLOY.md): `docker compose up -d --build`, HTTPS reverse proxy, Razorpay webhook, first-admin note and a launch checklist. In production the API refuses to start with a weak `JWT_SECRET` or without all three Razorpay values.

## Design tokens

All colours, radii, shadows and fonts live in `client/app/globals.css` (warm terracotta orange brand, cream neutrals, soft gold accent, deep brown footer and banner). Form controls share one style in `client/components/ui/form.tsx`. Components use semantic tokens (`bg-surface`, `text-muted`, `bg-primary`).

### Going live with Razorpay (test keys are free)

1. Create a Razorpay account, then **Settings > API Keys > Generate Test Key**. Put `RAZORPAY_KEY_ID` (`rzp_test_...`) and `RAZORPAY_KEY_SECRET` in `server/.env`.
2. **Settings > Webhooks > Add**: URL `https://<your-api-host>/api/webhooks/razorpay`, events `payment.captured`, `payment.failed`, `refund.processed`. Put the secret you choose in `RAZORPAY_WEBHOOK_SECRET`. For local testing expose the API with a tunnel (for example ngrok).
3. In the dashboard keep payment capture on **automatic**. Test with Razorpay's test cards/UPI (`success@razorpay`).
4. Restart the API: the startup line shows `payments: TEST`. After KYC, swap in `rzp_live_...` keys and it shows `LIVE`. In production the API refuses to start without all three values.
