# 1. Sign up, verification and sign in

[← Flows index](README.md) · [Pet profile →](02-pet-profile.md)

**Who:** owner, caretaker, admin

1. `/register` → `POST /auth/register` (role `owner` or `caretaker`). Sets the session cookie. If the database has no users yet, this first account also gets the `admin` role.
2. Owners can use the app straight away. A **verification email** with a link to `/verify-email?token=...` is sent (`POST /auth/verify-email` confirms it). In development email is auto-verified and a welcome email is sent instead. Booking requires a verified email. Until then dashboards show a yellow banner with **Resend email** (`POST /auth/resend-verification`).
3. A caretaker lands on `/caretaker/profile`:
   - `PUT /caretakers/me/profile` (bio, price per day, pet types, max pets, address)
   - the same `PUT` also takes **bank details** (account name, number, IFSC), saved in their own card. Admin sees them on the payouts screen
   - `POST /caretakers/me/documents/idProof|addressProof|photos`. ID and address proofs are stored **privately** (see [private documents](11-private-documents.md))
   - `POST /caretakers/me/submit` → status `pending`
4. Admin opens `/admin/verifications` → `PATCH /admin/caretakers/:id/verify` (approve, or reject with a reason). The caretaker is notified. Only `approved` profiles appear in search and can accept bookings. A rejected caretaker re-uploads and resubmits.

## Signing in and out

`POST /auth/login` sets the cookie. **Forgot password**: `POST /auth/forgot-password` emails a one-hour link, `POST /auth/reset-password` sets the new password. Every login token carries the account's `tokenVersion`; bumping it (password change, "sign out everywhere", block, delete) invalidates all existing sessions at once.
