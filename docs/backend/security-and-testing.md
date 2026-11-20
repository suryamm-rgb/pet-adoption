# Backend: Security and testing

[← Backend index](README.md)

## Security

bcrypt passwords, JWT in httpOnly cookie carrying a `tokenVersion` (password change, logout-all, block and delete revoke every session), private documents behind an access check, production start-up checks (strong `JWT_SECRET`, Razorpay keys), graceful shutdown, zod validation on every input, Mongo operator stripping (`middleware/sanitize.js`), helmet, strict CORS with credentials, rate limits (global, auth, payments), file type and 5 MB size limits, per-record ownership checks, signature checks on payments and webhooks, audit log for admin actions.

## Tests

`pnpm test` runs 41 tests in five files. `tests/flow.test.js` (pricing, refund tiers, auth, caretaker approval, vaccination rule, full booking and payment flow, forged signature, webhook signing and idempotency, double booking, daily update and chat, locked pet fields, review, payout, cancellation refunds, disputes) `tests/v2.test.js` (listing approval, adoption and ownership transfer, sale with held payment, shop pricing, stock and order steps), `tests/v3.test.js` (profile and password change signing out other devices, logout-all, account deletion, private file access rules, review reply and report moderation, order cancellation with refund and seller isolation, blocked dates, bank details validation, pagination) and `tests/mail.test.js` (email outbox, links, HTML escaping). Each file uses its own throwaway database.
