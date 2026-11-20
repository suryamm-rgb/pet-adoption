# 2. Pet profile

[← Sign up, verification and sign in](01-sign-up-and-sign-in.md) · [Booking, payment and stay →](03-booking-payment-and-stay.md)

**Who:** owner

`/owner/pets/new` → `POST /pets`, then `POST /pets/:id/vaccination`. Type is Dog, Cat, Rabbit, Bird or **Other**; "Other" requires a free-text type (for example Hamster), stored as `otherType` and shown instead of the word Other. Caretakers tick "Other" on their profile to accept such pets.

- Edit any field while no booking is locked. With an `ACCEPTED/PAID/IN_CARE` booking only care fields can change (allergies, medicines, food, routine, behaviour, vet, contacts). Each change is logged in `petupdates` and becomes an **instruction** the caretaker must acknowledge.
- A vaccination document is required before a booking can be requested. It is stored privately: only the owner, a caretaker with a booking for that pet, and admins can open it.
- At acceptance a `petSnapshot` is copied into the booking.
