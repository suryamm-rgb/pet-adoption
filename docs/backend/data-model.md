# Backend: Data model

[← Backend index](README.md)

`users`, `caretakerprofiles`, `pets`, `petupdates`, `bookings`, `payments`, `dailyupdates`, `messages`, `reviews`, `disputes`, `listings`, `adoptionrequests`, `products`, `orders`, `notifications`, `auditlogs`, `settings`, `reports`. Fields follow section 7 of the plan, with these additions:

- `users.tokenVersion` (bumped to sign out every device), `users.deletedAt`
- `caretakerprofiles.bankDetails`, `blockedDates` (`YYYY-MM-DD` strings)
- `pets.otherType`, `listings.otherPetType` (free text when the type is "Other")
- `reviews.reply {text, at}`, `reviews.hidden`
- `orders.statusHistory [{status, at}]`, `orders.shipment {courier, trackingNumber, shippedAt}`, `orders.cancelledAt/cancelReason/refundAmount`
- `reports` (reporter, target type and id, reason, status, resolver)
- `checkins` (booking, caretaker, kind, lat, lng, accuracy, note), `pushsubscriptions` (user, endpoint, keys)
- `users.googleId`, `users.phoneVerified` with hashed one-time code fields, `users.notifyPrefs {email, push, whatsapp}`
- `caretakerprofiles.razorpayLinkedAccountId`, `payoutAccountStatus`
- `bookings.acceptedAt/completedAt/payoutStatus`, `payments.listingId`, `listings.buyerId/title/petType/photos`, `settings.disputeWindowHours`

Indexes: `users.location` 2dsphere (sparse), `bookings {caretakerId,startDate,endDate}` and `{ownerId,status}`, unique sparse `payments.razorpayOrderId` and `razorpayPaymentId`, `messages {bookingId,createdAt}`, unique `reviews {bookingId,fromUserId}`.
