# 7. Buying a pet

[← Adoption](06-adoption.md) · [Pet shop, orders and tracking →](08-pet-shop.md)

**Who:** seller, owner

1. Seller lists with `mode: sell` and a price; admin approves.
2. Buyer: `POST /payments/sale/:id` → pay → listing `reserved`, money held.
3. After handover the buyer confirms: `POST /listings/:id/handover` → `closed`.
