# 9. Notifications and email

[← Pet shop, orders and tracking](08-pet-shop.md) · [Account settings →](10-account-settings.md)

**Who:** everyone

Created by services for: request, accept, reject, payment, stay start, daily update, instruction, message, emergency, completion, payout, refund or cancellation, verification result, dispute, listing and adoption updates, review replies and order cancellations. Delivered in-app (bell, live via Socket.io, polling fallback).

**Email (Nodemailer).** Account emails are always sent: verify email, welcome, reset password, "your password was changed". 19 important notification types are also emailed (booking requested, accepted, rejected, cancelled and expired, payment received, payout released, stay started and completed, trip reminder, dispute opened and resolved, emergency, verification result, listing, adoption, sale and order updates). Chat messages and daily updates stay in-app only. Set `SMTP_*` and `MAIL_FROM` in `server/.env`. With no SMTP host, emails are printed in the API log in development and dropped with a warning in production. A mail failure never blocks the action that triggered it. SMS is not connected.
