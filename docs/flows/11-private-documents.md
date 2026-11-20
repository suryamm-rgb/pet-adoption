# 11. Private documents

[← Account settings](10-account-settings.md) · [Reporting and moderation →](12-reporting-and-moderation.md)

**Who:** everyone

ID proof, address proof and vaccination certificates are **never public**. They are saved outside the public `/uploads` folder (or as authenticated Cloudinary assets) and opened through `GET /api/files/private/:key`, which requires login and allows only:

- admins
- the caretaker who owns the ID or address proof
- the pet's owner, or a caretaker with a booking for that pet (`REQUESTED` through `DISPUTED`)

Everyone else gets 403, anonymous visitors 401, and the file is not reachable by a public URL. Responses are `Cache-Control: private, no-store`. With Cloudinary a short-lived signed link is generated and the browser is redirected to it. Photos (pets, homes, listings, products, daily updates) stay public by unguessable URL.

Because the login cookie must accompany the file request, the website and API need the same parent domain in production.
