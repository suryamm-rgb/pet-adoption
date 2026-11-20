# 10. Account settings

[← Notifications and email](09-notifications-and-email.md) · [Private documents →](11-private-documents.md)

**Who:** everyone

`/account` (user menu > Account settings), for every role:

| Action | API | Effect |
|---|---|---|
| Edit name, phone, city | `PATCH /auth/me` | Email cannot be changed |
| Change password | `POST /auth/change-password` | Needs the current password. All other devices are signed out, this one stays signed in. A confirmation email is sent |
| Sign out of all devices | `POST /auth/logout-all` | Bumps `tokenVersion` |
| Delete account | `DELETE /auth/me` | Needs the password. Refused while a booking is `REQUESTED`, `ACCEPTED`, `PAID`, `IN_CARE` or `DISPUTED`, or if you are the only admin. Otherwise name, email, phone and city are erased, the account is blocked, listings are closed and a caretaker profile is hidden. Bookings and payments stay for accounting. The email address can be registered again |
