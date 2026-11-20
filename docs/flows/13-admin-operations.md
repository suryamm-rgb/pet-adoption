# 13. Admin operations

[← Reporting and moderation](12-reporting-and-moderation.md) · [Location check-ins →](14-location-check-ins.md)

**Who:** admin

- **Audit log** (`/admin/audit`): every admin action with time, admin and details, filterable by type (verifications, blocks, disputes, payouts, listings, reports, settings).
- **Payouts** (`/admin/payments`): each waiting payout shows the caretaker's bank account so the admin can transfer manually and click **Mark paid**.
- **Pagination**: bookings, payments, users and the audit log load 25 per page (`?page=&limit=`, max 100).
- **Caretaker search sorting**: `sort` = top rated, price low to high, price high to low, newest.
