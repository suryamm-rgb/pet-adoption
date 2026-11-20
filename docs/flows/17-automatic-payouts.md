# 17. Automatic payouts (Razorpay Route)

[← Google sign-in](16-google-sign-in.md) · [Going live →](18-going-live.md)

**Who:** caretaker, admin

`PAYOUT_MODE=manual` (default): the admin transfers by bank and clicks **Mark paid**. `PAYOUT_MODE=route`:

1. The caretaker saves bank details, then fills **Automatic payouts** on their profile (PAN and address). The API creates a Razorpay linked account (`POST /caretakers/me/payout-account`); the PAN is passed to Razorpay and never stored. Status: not set up, under review, active, needs information, rejected. Razorpay webhooks (`account.activated`, `account.needs_clarification`, `account.rejected`) keep it current.
2. After a stay completes and the dispute window passes, the **hourly job** transfers `caretakerGets` from the captured payment to the caretaker's linked account, records the transfer id, and notifies them. Caretakers who have not finished setup are skipped until they do.
3. Admins can also click **Pay via Razorpay** on the payouts screen, or **Pay by bank** (manual) as a fallback. If Razorpay refuses a transfer the payout stays pending and can be retried; a payout is never counted twice.

Mock mode (development, no Razorpay keys) simulates linked accounts and transfers. The live Route calls follow Razorpay's documentation but need a Route-enabled account to verify: test with test keys first.
