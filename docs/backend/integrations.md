# Backend: Integrations

[← Backend index](README.md)

## Image storage

With `CLOUDINARY_*` set, every upload goes to Cloudinary: public photos get a normal `https` URL, and private documents (ID, address, vaccination) are authenticated assets opened through a signed link after the access check. Without them files stay on local disk (`uploads/`, `private-uploads/`). The startup line prints `images: Cloudinary` or `images: local disk`, and production warns when Cloudinary is off. `pnpm migrate:uploads` (`scripts/migrate-uploads.js`, supports `--dry-run`) uploads existing local files and rewrites the database paths; it never deletes local files and is safe to re-run.

## Notification channels

`services/notify.js` writes the in-app notification, emits it over Socket.io, then delivers externally according to the user's `notifyPrefs`: email (`mailService`), web push (`pushService`, `web-push` with VAPID keys, dead subscriptions removed on 404/410) and WhatsApp (`smsService`, Twilio, only for a verified phone). All delivery is best effort and never blocks the action. `smsService` and `pushService` collect messages in memory in tests; the push sender and the Google token verifier are swappable (`setPushTransport`, `setGoogleVerifier`) so tests never touch the network.

## Email

`services/mailService.js` wraps Nodemailer. `sendMail` never throws. Modes: SMTP when `SMTP_HOST` is set; logged to the console in development; collected in an in-memory `outbox` in tests. `notify.js` emails 19 event types after creating the in-app notification. All emails share one branded HTML layout with a plain-text twin, and user text is HTML-escaped.

## Automatic payouts

`paymentService.payoutBooking` pays by bank record (manual) or by Razorpay Route transfer from the captured payment to the caretaker's linked account (`PAYOUT_MODE=route`). The booking is claimed first and reverted to `pending` if the transfer fails, so a payout is never paid twice or lost. `jobs/index.js` `autoPayouts` runs hourly in route mode. `razorpayService.createLinkedAccount/createTransfer` wrap the Razorpay Route calls (mock in development). The live calls follow Razorpay's documentation but could not be exercised without a Route-enabled account.

## Error monitoring

`config/monitoring.js` starts Sentry only when `SENTRY_DSN` is set (and never in tests). Reported: API errors with status 500 and above (with route, method and user id only, no request bodies or personal data), unhandled rejections and uncaught exceptions (the process then exits so the host restarts it). Browser crashes arrive through `POST /api/client-errors` (anonymous allowed, validated, 10 per minute per IP), which the website calls from its error pages and from `window` error and unhandled-rejection listeners, at most 5 distinct errors per page load. The startup line prints `monitoring: Sentry` or `off`.
