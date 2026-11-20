# Backend: Deployment files and known limits

[← Backend index](README.md)

## Deployment files

`server/Dockerfile` (non-root, health check), `client/Dockerfile` (Next.js standalone output), `docker-compose.yml` (mongo, api, web, volumes), `.github/workflows/ci.yml`, and [../../DEPLOY.md](../../DEPLOY.md).

## Known limits

- The Twilio (SMS, WhatsApp), Google and Razorpay Route integrations are written to the providers' documentation and covered by tests that replace the provider; they have not been exercised against the live services. Try each on test or sandbox credentials first.
- WhatsApp business-initiated messages need Meta-approved templates in production; the sandbox does not.
- MongoDB transactions are not used. Atomic status updates cover the main races; a replica set would allow transactions later.
- Background jobs run inside the API process: run one instance, or move `startJobs()` to a worker before scaling out.
- Photos are public by unguessable URL. Only ID, address and vaccination documents are private.
- No error-monitoring service (such as Sentry) is wired in; errors go to stdout.
