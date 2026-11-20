# 15. Phone verification, WhatsApp and browser notifications

[← Location check-ins](14-location-check-ins.md) · [Google sign-in →](16-google-sign-in.md)

**Who:** everyone

**Phone verification** (`/account`): `POST /auth/phone/send-otp` texts a 6 digit code (valid 10 minutes, one request per minute), `POST /auth/phone/verify-otp` checks it (5 wrong tries lock that code; codes are stored hashed and single use). Changing the phone number clears the verified flag and switches WhatsApp off. With `REQUIRE_PHONE_VERIFICATION=true` a caretaker cannot submit for admin verification until the phone is verified. In development without an SMS provider the code is shown on screen so the flow can be tried.

**Notification preferences** (`PATCH /auth/preferences`, Account page): per user switches for **email** (default on), **browser notifications** (default on once subscribed) and **WhatsApp** (opt-in, needs a verified phone). Delivery, per event: the in-app bell always; email for 23 important event types; push for every event; WhatsApp for booking requests, acceptance and rejection, payment, stay start, daily updates, check-ins, emergencies, completion, order shipped and payouts.

**Browser notifications**: the Account page asks the browser for permission, registers `/sw.js` and stores the subscription (`POST /auth/push/subscribe`). A user can have several devices. Tapping a notification opens the relevant page. Subscriptions that the browser has dropped (404/410) are deleted automatically. Needs VAPID keys and HTTPS.
