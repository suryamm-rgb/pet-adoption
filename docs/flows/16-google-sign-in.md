# 16. Google sign-in

[← Phone verification, WhatsApp and browser notifications](15-phone-alerts-and-push.md) · [Automatic payouts (Razorpay Route) →](17-automatic-payouts.md)

**Who:** everyone

With `GOOGLE_CLIENT_ID` set, login and sign-up show **Continue with Google**. The browser gets a Google ID token, `POST /auth/google` verifies it with Google, requires a verified Google email, then signs in. A matching email links to the existing account (and marks the email verified); a new email creates an owner account (or a caretaker, from the sign-up page's role choice). Blocked or deleted accounts are refused. Google accounts get an unusable random password until they use "Forgot password".
