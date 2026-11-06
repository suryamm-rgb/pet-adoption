# Frontend

Next.js 16 (App Router, Cache Components) + React 19 + Tailwind CSS v4, in `client/`. Data fetching uses TanStack Query, forms use React Hook Form + Zod.

Read `client/AGENTS.md` first: this Next.js version differs from older ones, and the docs in `client/node_modules/next/dist/docs/` are the reference.

## Folder structure

```
client/
|-- app/
|   |-- globals.css            design tokens
|   |-- layout.tsx, providers.tsx, error.tsx, not-found.tsx
|   |-- (public)/              home, caretakers, caretakers/[id], adopt, pets-for-sale,
|   |                          listings/[id], shop, shop/cart, login, register,
|   |                          forgot-password, reset-password, verify-email, legal/[slug]
|   |-- owner/                 dashboard, pets, pets/new, pets/[id], bookings, bookings/[id],
|   |                          payments, reviews, adoptions, orders
|   |-- caretaker/             dashboard, profile, requests, stays, stays/[id], calendar, earnings
|   |-- seller/                listings, listings/new, requests, products
|   `-- admin/                 dashboard, verifications, listings, bookings, bookings/[id],
|                              payments, disputes, users, settings, orders
|-- components/
|   |-- ui/                    button, badge, card, form, table, feedback (spinner, skeleton, modal, Query), misc
|   |-- layout/                site-header, site-footer, dashboard-shell, notification-bell, user-menu
|   |-- features/              booking-form, booking-detail, booking-table, chat, pet-form, ...
|   `-- toast.tsx
`-- lib/                       api.ts, auth.tsx, hooks.ts, types.ts, format.ts, cart.tsx, socket.ts, razorpay.ts, cn.ts
```

Page files are small. They set metadata and render a feature component. Pages that read the URL (`[id]`, `useSearchParams`) wrap the component in `<Suspense>`, which Cache Components requires.

## Running

```bash
cd client
pnpm install
echo "NEXT_PUBLIC_API_URL=http://localhost:5001/api" > .env.local
pnpm dev          # http://localhost:3000
pnpm lint && pnpm build
```

## Design tokens (`app/globals.css`)

Three layers, so components never use raw colours:

1. **Raw scales** in `@theme`: `brand-50…900` (vivid teal), `accent-50…700` (sunny orange), highlight colours `sky`, `berry`, `sun`, status colours (`success`, `warning`, `danger`, `info`), radii, shadows, fonts, layout sizes (`--spacing-sidebar`, `--spacing-header`, `--container-page`), animations, hero gradient.
2. **Semantic tokens** in `:root` (warm cream light theme, the default). A dark theme exists under `:root[data-theme="dark"]` and is off unless that attribute is set on `<html>`: `background`, `surface`, `surface-muted`, `border`, `foreground`, `muted`, `primary`, `primary-hover`, `primary-soft`, `ring`. They are exposed to Tailwind with `@theme inline`, giving classes such as `bg-surface`, `text-muted`, `bg-primary`.
3. **Status tokens** used by `Badge` and `StatusBadge`.

To re-brand, change the `brand` and `accent` scales. To change dark mode, edit the dark block. No component changes are needed.

## Data and auth

- `lib/api.ts` is the only fetch wrapper (cookies included). It throws `ApiError` with the server message and field details.
- `lib/auth.tsx` holds the session in a TanStack Query entry `["me"]`. `useRequireAuth()` redirects anonymous visitors to `/login?next=…`.
- `DashboardShell` wraps `/owner`, `/caretaker`, `/seller` and `/admin`. A role gate shows "Become a caretaker/seller" when a user lacks the role, or "no access" for admin.
- `lib/hooks.ts`: `useGet(path, key)` for reads and `useAction(fn, {invalidate, success})` for writes, with toast feedback and cache invalidation.
- `<Query q={query}>` renders skeleton, error with retry, or the data, so every screen has loading and error states.
- Cart lives in `localStorage` (`lib/cart.tsx`, an external store). Prices are re-checked by the server at checkout.
- Real-time: `lib/socket.ts` shares one Socket.io connection. Chat and the notification bell invalidate their queries on events and also poll as a fallback.
- Payments: `lib/razorpay.ts` opens Razorpay Checkout. When the API reports key `rzp_mock` it asks for confirmation and calls `/payments/mock-complete` instead.

## Responsive and accessibility rules used

- Mobile first. Dashboards use a slide-over drawer under 768 px and a fixed sidebar above.
- Data tables are hidden on phones and shown as cards (`BookingTable`); other tables scroll inside their own wrapper.
- No horizontal page scroll at 375 px (checked on every main screen).
- Labels on every field, `aria-invalid` and error text, `aria-live` on price summaries and chat, focus ring tokens, `prefers-reduced-motion` respected, native `<dialog>` for modals.
- `color-scheme: light` so native controls (date pickers, dropdown lists) match the light theme.

## Screens by role

| Role | Screens |
|---|---|
| Public | Home, Find caretakers (filters in the URL), Caretaker profile with booking form and live price, Adopt, Pets for sale, Listing detail (adopt request, buy, chat), Shop, Cart and checkout, Login, Register, Forgot and reset password, Verify email, Legal pages |
| Owner | Dashboard, My pets, Add and edit pet (health, care, behaviour, emergency, vaccination upload, change history), My bookings, Booking detail (timeline, daily updates, instructions, chat, pay, cancel with refund preview, complete, dispute, review, invoice), Payments, Reviews, Adoption requests, Shop orders |
| Caretaker | Dashboard, Profile and verification (documents, submit), Booking requests (accept or decline), Stays and stay detail (post update, acknowledge instructions, emergency), Availability calendar, Earnings |
| Seller | My listings, New listing, Incoming adoption requests with chat, Products |
| Admin | Dashboard, Verification queue, Listing approvals, All bookings and detail (read-only chat), Payments and payouts (release, refund), Disputes (decide), Users (block), Settings (fee, refund rules, deadlines), Shop orders |

## Conventions

- New server data: add a type to `lib/types.ts`, read with `useGet`, write with `useAction`.
- New screen: put the logic in `components/features/<name>.tsx`, keep `page.tsx` tiny, and wrap URL-dependent components in `<Suspense>`.
- Use tokens (`bg-surface`, `text-muted`, `border-border`), never hex values.
- Do not call `setState` synchronously inside `useEffect` (lint rule). Derive the value or use an external store.
