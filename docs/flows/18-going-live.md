# 18. Going live

[← Automatic payouts (Razorpay Route)](17-automatic-payouts.md) · [Booking status reference →](19-status-reference.md)

**Who:** admin

1. Atlas database, Razorpay live keys and webhook, SMTP provider, optional Cloudinary, a domain with HTTPS. Website and API on the same parent domain.
2. `docker compose up -d --build` with a `.env` file. The API refuses to start in production with a weak `JWT_SECRET` or missing Razorpay values.
3. Register the first account immediately: it becomes the admin.
4. Check `/api/health`, a test email, a test payment and private file access. Full checklist in [../../DEPLOY.md](../../DEPLOY.md).
5. CI (`.github/workflows/ci.yml`) runs server tests, type-check, lint, build and Docker builds on every push.
