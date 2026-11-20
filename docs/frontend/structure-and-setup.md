# Frontend: Structure and setup

[← Frontend index](README.md)

## Folder structure

```
client/
|-- app/
|   |-- globals.css            design tokens
|   |-- layout.tsx, providers.tsx, error.tsx, not-found.tsx
|   |-- (public)/              home, caretakers, caretakers/[id], adopt, pets-for-sale,
|   |                          listings/[id], shop, shop/cart, login, register,
|   |                          forgot-password, reset-password, verify-email, account, legal/[slug]
|   |-- robots.ts, sitemap.ts, manifest.ts, icon.svg   SEO and install metadata
|   |-- owner/                 dashboard, pets, pets/new, pets/[id], bookings, bookings/[id],
|   |                          payments, reviews (reply, report), adoptions, orders (cancel)
|   |-- caretaker/             dashboard, profile (bank details), requests, stays, stays/[id],
|   |                          calendar (block days), earnings, reviews
|   |-- seller/                listings, listings/new, requests, products, orders
|   `-- admin/                 dashboard, verifications, listings, bookings, bookings/[id],
|                              payments, disputes, users, settings, orders, reports, audit
|-- components/
|   |-- ui/                    button, badge, card, form, table, pager, feedback (spinner, skeleton, modal, Query), misc
|   |-- layout/                site-header, site-footer, dashboard-shell, notification-bell, user-menu
|   |-- features/              booking-form, booking-detail, account-views, report-button, chat, pet-form, ...
|   `-- toast.tsx
`-- lib/                       site.ts (public URL), api.ts, auth.tsx, hooks.ts, types.ts, format.ts, cart.tsx, socket.ts, razorpay.ts, cn.ts
```

Page files are small. They set metadata and render a feature component. Pages that read the URL (`[id]`, `useSearchParams`) wrap the component in `<Suspense>`, which Cache Components requires.

## Running

```bash
cd client
pnpm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL and NEXT_PUBLIC_SITE_URL
pnpm dev          # http://localhost:3000
pnpm lint && pnpm build
pnpm e2e          # Playwright end-to-end tests (see the README)

Browser notifications use `public/sw.js` (service worker) and `lib/push.ts`. They need HTTPS in production (localhost works in development).
```
