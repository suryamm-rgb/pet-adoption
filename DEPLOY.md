# Deploying PawStay to production

Two apps, one database:

| Part | What | Needs |
|---|---|---|
| `server/` | Express API + Socket.io + background jobs | Node 22, MongoDB, persistent disk (or Cloudinary) |
| `client/` | Next.js website | Node 22 |

**Important:** the website and API must share a parent domain (for example `pawstay.in` and `api.pawstay.in`). Login uses a `SameSite=Lax` cookie, which browsers do not send between unrelated domains.

## 1. Accounts you need (all have free tiers)

1. **MongoDB Atlas** (free M0): create a cluster, a database user, allow your server's IP, copy the connection string.
2. **Razorpay**: complete KYC, then copy live keys. Create a webhook (see step 3).
3. **An SMTP provider** for email: Brevo, SendGrid, Amazon SES, or Gmail with an app password.
4. **Cloudinary** (strongly recommended): every uploaded image and document is then stored there instead of on your server. Without it, files live in Docker volumes and you must back them up yourself. To move files you already saved locally, back up the database and run `pnpm migrate:uploads -- --dry-run`, then `pnpm migrate:uploads` (inside `server/`, or `docker compose exec api node scripts/migrate-uploads.js`). It does not delete the local files.
5. A **domain** and a server (a small VPS, Railway, Render, Fly.io or similar).

## 2. Configure

Create `.env` next to `docker-compose.yml` (never commit it):

```bash
JWT_SECRET=<openssl rand -hex 32>
CLIENT_URL=https://pawstay.in
NEXT_PUBLIC_API_URL=https://api.pawstay.in/api
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=xxx
SMTP_PASS=xxx
MAIL_FROM=PawStay <no-reply@pawstay.in>
# Optional extras (each one switches on a feature; leave empty to skip):
TWILIO_ACCOUNT_SID=         # SMS verification codes + WhatsApp alerts
TWILIO_AUTH_TOKEN=
TWILIO_SMS_FROM=
TWILIO_WHATSAPP_FROM=
REQUIRE_PHONE_VERIFICATION=false
VAPID_PUBLIC_KEY=           # browser notifications: npx web-push generate-vapid-keys
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:support@pawstay.in
GOOGLE_CLIENT_ID=           # "Continue with Google"
PAYOUT_MODE=manual          # route = automatic Razorpay Route payouts
SENTRY_DSN=                 # error monitoring, free plan at sentry.io
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

To use Atlas instead of the bundled Mongo container, change `MONGO_URI` for the `api` service in `docker-compose.yml` and remove the `mongo` service.

The API refuses to start in production if `JWT_SECRET` is weak or any Razorpay value is missing. That is intentional.

## 2b. Optional features: what each needs

| Feature | You need | Switch on |
|---|---|---|
| **Phone verification (SMS)** | A Twilio account and an SMS-capable number. In India you must register your sender (DLT) with your provider, which can take days: start early | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM`. Add `REQUIRE_PHONE_VERIFICATION=true` to make it mandatory for caretakers |
| **WhatsApp alerts** | Twilio WhatsApp. The sandbox works for testing; production needs an approved sender and approved message templates (Meta rules: business-initiated messages need templates) | `TWILIO_WHATSAPP_FROM`. Users opt in on their Account page |
| **Browser notifications** | Nothing external. Generate keys: `npx web-push generate-vapid-keys` | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. Needs HTTPS |
| **Google sign-in** | A Google Cloud project: Credentials > OAuth client ID > Web. Add your site under Authorised JavaScript origins | `GOOGLE_CLIENT_ID` (the server tells the website, no client variable needed) |
| **Automatic payouts** | Razorpay **Route** enabled on your account (apply in the dashboard) | `PAYOUT_MODE=route`. Caretakers then set up their payout account on their profile; the hourly job pays eligible stays |
| **Location check-ins** | Nothing. Uses the phone's location and a free OpenStreetMap map | Always on |

Test each on test or sandbox credentials first. The Twilio, Google and Razorpay Route calls were written to those providers' documentation and covered by tests that replace the provider, but they have not been exercised against the live services.

## 3. Razorpay webhook

Dashboard > Settings > Webhooks > Add. URL `https://api.pawstay.in/api/webhooks/razorpay`, events `payment.captured`, `payment.failed`, `refund.processed` (and, for automatic payouts, `account.activated`, `account.needs_clarification`, `account.rejected`), and the same secret as `RAZORPAY_WEBHOOK_SECRET`. Leave payment capture on **automatic**.

## 4. Run

```bash
docker compose up -d --build
docker compose exec api node seed.js   # optional demo data: do NOT run on a real production database
```

Put a reverse proxy with HTTPS in front (Caddy is the simplest):

```
pawstay.in      { reverse_proxy localhost:3000 }
api.pawstay.in  { reverse_proxy localhost:5001 }
```

Socket.io works through the same proxy with no extra setup.

## 5. First admin

The **first account registered on an empty database becomes the admin**. Register it yourself immediately after deploying, before announcing the site.

## 6. Before you announce

- [ ] `https://api.pawstay.in/api/health` returns `{"ok":true,"db":"up"}`
- [ ] Register, receive the verification email, log in
- [ ] Make a Razorpay test-mode payment on a staging copy first; then switch to live keys
- [ ] Upload an ID document as a caretaker, open it as admin; confirm another user gets 403
- [ ] Back up MongoDB (Atlas does this) and the `uploads` / `private-uploads` volumes if you are not on Cloudinary
- [ ] Have the legal pages in `client/app/(public)/legal` reviewed by a lawyer. They are templates
- [ ] Trigger a test error and confirm it appears in Sentry (set `SENTRY_DSN` first)
- [ ] Add uptime monitoring on `/api/health` (UptimeRobot, Better Stack)

## 7. Operating notes

- Payouts to caretakers are a manual bank transfer from the admin screen (`Payments & payouts` shows each caretaker's bank details).
- Background jobs (expiries, reminders, auto-complete) run inside the API process. Run **one** API instance, or move `startJobs()` to a separate worker before scaling out.
- Logs go to stdout: `docker compose logs -f api`.
- Deploys: `git pull && docker compose up -d --build`. The API shuts down gracefully on SIGTERM.
