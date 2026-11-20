# 6. Adoption

[← Disputes and reviews](05-disputes-and-reviews.md) · [Buying a pet →](07-buying-a-pet.md)

**Who:** seller, owner, admin

1. Seller: `POST /listings` (mode `adopt`) → `pending`. Admin approves at `/admin/listings`.
2. Visitor opens `/listings/:id` → `POST /listings/:id/requests`. They can chat with the lister.
3. Lister: `PATCH /listings/requests/:id/status` → `approved` (listing `reserved`) → `completed` (listing `closed`, linked pet moves to the adopter).
