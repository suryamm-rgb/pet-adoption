# Frontend: Data, auth and real-time

[← Frontend index](README.md)

- `lib/api.ts` is the only fetch wrapper (cookies included). It throws `ApiError` with the server message and field details.
- `lib/auth.tsx` holds the session in a TanStack Query entry `["me"]`. `useRequireAuth()` redirects anonymous visitors to `/login?next=…`.
- `DashboardShell` wraps `/owner`, `/caretaker`, `/seller` and `/admin`. A role gate shows "Become a caretaker/seller" when a user lacks the role, or "no access" for admin.
- `lib/hooks.ts`: `useGet(path, key)` for reads and `useAction(fn, {invalidate, success})` for writes, with toast feedback and cache invalidation.
- `<Query q={query}>` renders skeleton, error with retry, or the data, so every screen has loading and error states.
- Cart lives in `localStorage` (`lib/cart.tsx`, an external store). Prices are re-checked by the server at checkout.
- Real-time: `lib/socket.ts` shares one Socket.io connection. Chat and the notification bell invalidate their queries on events and also poll as a fallback.
- Payments: `lib/razorpay.ts` opens Razorpay Checkout. When the API reports key `rzp_mock` it asks for confirmation and calls `/payments/mock-complete` instead.
