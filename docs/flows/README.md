# End-to-end flows

How the screens, API calls and background jobs fit together. Paths are API paths under `/api`. For the product rules see [pet-care-platform-plan.md](../pet-care-platform-plan.md).

Each page covers one flow from the person's screen, through the API, to background jobs and notifications.

## All flows

| # | Flow | What it covers |
|---|---|---|
| 1 | [Sign up, verification and sign in](01-sign-up-and-sign-in.md) | Register, verify email, caretaker approval, forgot password, sessions. |
| 2 | [Pet profile](02-pet-profile.md) | Pet details, the "Other" type, vaccination certificate, care-instruction changes. |
| 3 | [Booking, payment and stay](03-booking-payment-and-stay.md) | Request, accept, pay, daily updates, chat, completion, payout, availability, activity feed. |
| 4 | [Cancellation and refunds](04-cancellation-and-refunds.md) | Who can cancel when, and the refund tiers. |
| 5 | [Disputes and reviews](05-disputes-and-reviews.md) | Raising and resolving disputes, then reviews and replies. |
| 6 | [Adoption](06-adoption.md) | List a pet for adoption, requests, approval, ownership transfer. |
| 7 | [Buying a pet](07-buying-a-pet.md) | Sale listings, held payment, handover confirmation. |
| 8 | [Pet shop, orders and tracking](08-pet-shop.md) | Cart, checkout, fulfilment, courier tracking, cancellation and refund. |
| 9 | [Notifications and email](09-notifications-and-email.md) | In-app, email events, and the channels each event uses. |
| 10 | [Account settings](10-account-settings.md) | Edit details, change password, sign out everywhere, delete account. |
| 11 | [Private documents](11-private-documents.md) | Who may open ID proofs and vaccination papers. |
| 12 | [Reporting and moderation](12-reporting-and-moderation.md) | Report content, admin queue, audit trail. |
| 13 | [Admin operations](13-admin-operations.md) | Audit log, payouts, pagination and sorting. |
| 14 | [Location check-ins](14-location-check-ins.md) | Caretaker shares a location on purpose; owner sees it on a map. |
| 15 | [Phone verification, WhatsApp and browser notifications](15-phone-alerts-and-push.md) | OTP verification, notification preferences, web push. |
| 16 | [Google sign-in](16-google-sign-in.md) | Continue with Google, account linking. |
| 17 | [Automatic payouts (Razorpay Route)](17-automatic-payouts.md) | Caretaker onboarding and automatic transfers, with a manual fallback. |
| 18 | [Going live](18-going-live.md) | Launch steps in brief. |
| 19 | [Booking status reference](19-status-reference.md) | Every booking status transition in one table. |

## Find a flow by role

| Role | Flows |
|---|---|
| Pet owner | [Sign up, verification and sign in](01-sign-up-and-sign-in.md), [Pet profile](02-pet-profile.md), [Booking, payment and stay](03-booking-payment-and-stay.md), [Cancellation and refunds](04-cancellation-and-refunds.md), [Disputes and reviews](05-disputes-and-reviews.md), [Adoption](06-adoption.md), [Buying a pet](07-buying-a-pet.md), [Pet shop, orders and tracking](08-pet-shop.md), [Location check-ins](14-location-check-ins.md) |
| Caretaker | [Sign up, verification and sign in](01-sign-up-and-sign-in.md), [Booking, payment and stay](03-booking-payment-and-stay.md), [Cancellation and refunds](04-cancellation-and-refunds.md), [Disputes and reviews](05-disputes-and-reviews.md), [Location check-ins](14-location-check-ins.md), [Automatic payouts (Razorpay Route)](17-automatic-payouts.md) |
| Seller or shelter | [Adoption](06-adoption.md), [Buying a pet](07-buying-a-pet.md), [Pet shop, orders and tracking](08-pet-shop.md) |
| Admin | [Sign up, verification and sign in](01-sign-up-and-sign-in.md), [Cancellation and refunds](04-cancellation-and-refunds.md), [Disputes and reviews](05-disputes-and-reviews.md), [Adoption](06-adoption.md), [Pet shop, orders and tracking](08-pet-shop.md), [Reporting and moderation](12-reporting-and-moderation.md), [Admin operations](13-admin-operations.md), [Automatic payouts (Razorpay Route)](17-automatic-payouts.md), [Going live](18-going-live.md) |
| Everyone | [Notifications and email](09-notifications-and-email.md), [Account settings](10-account-settings.md), [Private documents](11-private-documents.md), [Reporting and moderation](12-reporting-and-moderation.md), [Phone verification, WhatsApp and browser notifications](15-phone-alerts-and-push.md), [Google sign-in](16-google-sign-in.md) |

## The main journey in one picture

```
Owner                        Platform                           Caretaker
-----                        --------                           ---------
sign up, verify email                                           sign up, upload ID, bank details
add pet + vaccination                                           admin verifies -> appears in search
search, pick dates   -->  request  ------------------------->   accept (capacity + availability checked)
pay (Razorpay)       <--  money held by the platform
                          stay starts (job)                     daily photo updates, location check-ins
chat, instructions   <--  push / WhatsApp / email / in-app -->  chat, acknowledge, emergency button
confirm pet is home  -->  dispute window
review                    payout (manual or Razorpay Route)     review, reply
```

Related: [backend](../backend/README.md), [frontend](../frontend/README.md), [deployment guide](../../DEPLOY.md), [original plan](../pet-care-platform-plan.md).
