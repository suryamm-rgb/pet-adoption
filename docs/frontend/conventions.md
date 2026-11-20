# Frontend: Conventions

[← Frontend index](README.md)

- New server data: add a type to `lib/types.ts`, read with `useGet`, write with `useAction`.
- New screen: put the logic in `components/features/<name>.tsx`, keep `page.tsx` tiny, and wrap URL-dependent components in `<Suspense>`.
- Use tokens (`bg-surface`, `text-muted`, `border-border`), never hex values.
- `components/features/checkins.tsx`: the Locations card (share form for caretakers, OpenStreetMap embed for everyone). `google-button.tsx` loads Google Identity Services only when the server reports a client id.
- A "Report" link (`report-button.tsx`) can go next to any user content: pass `targetType` and `targetId`.
- Lists the API pages (`?page=&limit=`) use `<Pager>`; it shows "Next" while a full page comes back.
- Dashboards show a verify-email banner with **Resend email** until the address is verified.
- Do not call `setState` synchronously inside `useEffect` (lint rule). Derive the value or use an external store.
