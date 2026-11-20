# 12. Reporting and moderation

[← Private documents](11-private-documents.md) · [Admin operations →](13-admin-operations.md)

**Who:** everyone, admin

1. A logged-in user taps **Report** on a review, listing or caretaker: `POST /reports` (reason: inappropriate, abuse, fraud, spam, other, plus optional details). One open report per user per item.
2. Admin opens `/admin/reports` (open, actioned, dismissed tabs) and chooses:
   - **Dismiss**
   - **Remove content**: a review is hidden (and the rating recalculated), a listing is rejected, a product is deactivated, a message is replaced by "removed by moderator"
   - **Remove and block author**: the same, and the author is blocked and signed out. An admin account cannot be blocked this way
3. Every decision is written to the audit log.
