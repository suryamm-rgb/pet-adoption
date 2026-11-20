# Frontend: Design system

[← Frontend index](README.md)

## Design tokens (`app/globals.css`)

Three layers, so components never use raw colours:

1. **Raw scales** in `@theme`: `brand-50…900` (warm terracotta orange, 600 is the button colour and passes 4.5:1 with white text, 800 and 900 are the deep brown used by the banner and footer), `accent-50…700` (soft gold for ratings and highlights), soft sage, blush and butter tints (`sky`, `berry`, `sun`), status colours (`success`, `warning`, `danger`, `info`), radii, shadows, fonts, layout sizes (`--spacing-sidebar`, `--spacing-header`, `--container-page`), animations, hero gradient.
2. **Semantic tokens** in `:root` (warm cream). They are exposed to Tailwind with `@theme inline`, giving classes such as `bg-surface`, `text-muted`, `bg-primary`. The site has a single light theme.
3. **Status tokens** used by `Badge` and `StatusBadge`.

To re-brand, change the `brand` and `accent` scales. No component changes are needed.

## Responsive and accessibility rules used

- Mobile first. Dashboards use a slide-over drawer under 768 px and a fixed sidebar above.
- Data tables are hidden on phones and shown as cards (`BookingTable`); other tables scroll inside their own wrapper.
- No horizontal page scroll at 375 px (checked on every main screen).
- Labels on every field, `aria-invalid` and error text, `aria-live` on price summaries and chat, focus ring tokens, `prefers-reduced-motion` respected, native `<dialog>` for modals.
- Every text box, date picker and dropdown shares one style (`components/ui/form.tsx`): taller controls, soft border, orange hover and focus ring, and a custom dropdown arrow (`.select-chevron` in `globals.css`).
- Shop orders use `components/features/order-tracking.tsx`: `OrderTracker` (steps, timestamps, courier and tracking number) and `ShipModal` (asks for courier and tracking number before shipping). The booking page has an `ActivityFeed` card.
- Browser errors are reported by `lib/report-error.ts` (error pages and global listeners) to the API.
- The homepage alternates white, cream and peach-tinted full-width bands so sections read as separate blocks.
- `color-scheme: light` so native controls (date pickers, dropdown lists) match the light theme.
