# Backend documentation

Express 4 + MongoDB (Mongoose 9), ES modules, in `server/`. Money is always **integer paise**.

| Page | What is in it |
|---|---|
| [Structure and setup](structure-and-setup.md) | Where the code lives, how to run the API, and every environment variable. |
| [Data model](data-model.md) | MongoDB collections, the fields added after the original plan, and indexes. |
| [API reference](api.md) | Every route by audience: public, auth, owner, caretaker, both parties, payments, admin. |
| [Business rules, jobs and real-time](business-rules.md) | Where each rule is enforced, the cron jobs, and Socket.io rooms. |
| [Integrations](integrations.md) | Cloudinary, email, push, WhatsApp and SMS, Razorpay Route payouts, Sentry. |
| [Security and testing](security-and-testing.md) | The security measures in place and what the 41 server tests cover. |
| [Deployment files and known limits](deployment-and-limits.md) | Docker, CI, and what is deliberately not done yet. |

Related: [end-to-end flows](../flows/README.md), [frontend](../frontend/README.md), [deployment guide](../../DEPLOY.md).

## At a glance

- Express 4 + MongoDB (Mongoose 9), ES modules, in `server/`. Money is always **integer paise**.
- Layers: `routes` (URLs and middleware) → `controllers` (thin) → `services` (all business rules) → `models`.
- Optional integrations switch on by environment variable and degrade safely when absent: Cloudinary, Nodemailer SMTP, Twilio (SMS and WhatsApp), Web Push, Google sign-in, Razorpay (mock, test, live, Route), Sentry.
