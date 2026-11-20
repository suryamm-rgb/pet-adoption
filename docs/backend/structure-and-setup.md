# Backend: Structure and setup

[← Backend index](README.md)

## Folder structure

```
server/
|-- app.js            builds the Express app (helmet, cors, rate limit, raw webhook route, routes)
|-- server.js         connects Mongo, starts HTTP, Socket.io and cron jobs
|-- seed.js           demo users, caretakers and products
|-- config/           env.js (+ production checks), db.js, razorpay.js (mock/test/live), cloudinary.js
|-- models/           one file per collection + index.js (re-exports) + helpers.js
|-- routes/           URL + middleware wiring only (authRoutes.js, bookingRoutes.js, ...)
|-- controllers/      thin: read req, call a service, send res
|-- services/         all business rules (booking, payment, shop, reports, reviews, auth) + mailService.js (Nodemailer) + notify.js
|-- middleware/       auth, validate (zod), sanitize, upload (public + private), error
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
pnpm test         # 41 tests
```

| Variable | Purpose |
|---|---|
| `PORT` | default 5001 (macOS uses 5000 for AirPlay) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | required in production, at least 32 random characters (the API refuses to start otherwise) |
| `CLIENT_URL` | allowed CORS origin(s), comma separated. The first is used in email links. Default `http://localhost:3000` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | email through Nodemailer. Empty host: emails are logged in development |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | real payments (all three required in production). Empty in development = mock mode. The startup line shows `MOCK`, `TEST` or `LIVE` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | optional. Otherwise public files go to `server/uploads` and private documents to `server/private-uploads` |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM`, `TWILIO_WHATSAPP_FROM` | SMS verification codes and WhatsApp alerts (Twilio REST API). Empty = codes are shown on screen in development, WhatsApp is skipped |
| `REQUIRE_PHONE_VERIFICATION` | `true`: caretakers must verify their phone before they can be approved |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | browser push notifications. Generate with `npx web-push generate-vapid-keys` |
| `GOOGLE_CLIENT_ID` | Google sign-in (the website reads it from `/settings/public`) |
| `PAYOUT_MODE` | `manual` (default) or `route` (automatic Razorpay Route payouts) |
| `SENTRY_DSN`, `SENTRY_ENVIRONMENT` | optional error monitoring. Empty = off |
| `AUTO_VERIFY_EMAIL` | development only. Set `false` to test the verification link flow |
