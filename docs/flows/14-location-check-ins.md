# 14. Location check-ins

[← Admin operations](13-admin-operations.md) · [Phone verification, WhatsApp and browser notifications →](15-phone-alerts-and-push.md)

**Who:** caretaker, owner

While a stay is `IN_CARE`, the caretaker's stay page has **Share where you are**: pick Walk, Vet visit, Back home or Location, add an optional note, tap **Share location**. The phone's GPS is read **only at that tap**, nothing is tracked in the background. `POST /bookings/:id/checkins` is limited to the caretaker of an in-care booking and to 3 per minute. The owner is notified (in-app, push and WhatsApp if enabled; not emailed) and sees a **Locations** card on the booking page: the latest point on an OpenStreetMap map (free, no API key), a link to a larger map, and the last 8 check-ins with time, note and accuracy. The card refreshes every 30 seconds. Only the two parties and admins can read check-ins.
