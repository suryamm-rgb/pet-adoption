# Frontend documentation

Next.js 16 (App Router, Cache Components) + React 19 + Tailwind CSS v4, in `client/`. Data fetching uses TanStack Query, forms use React Hook Form + Zod.

Read `client/AGENTS.md` first: this Next.js version differs from older ones, and the docs in `client/node_modules/next/dist/docs/` are the reference.

| Page | What is in it |
|---|---|
| [Structure and setup](structure-and-setup.md) | Folder layout, how to run, build, lint and run the browser tests. |
| [Design system](design-system.md) | Colour, type and spacing tokens, form controls, responsive and accessibility rules. |
| [Data, auth and real-time](data-and-auth.md) | API wrapper, session, queries and actions, cart, sockets, payments, push. |
| [Screens by role](screens.md) | Every page for public visitors, owners, caretakers, sellers and admins. |
| [Conventions](conventions.md) | How to add data, screens and components the way this codebase does. |

Related: [end-to-end flows](../flows/README.md), [backend](../backend/README.md), [deployment guide](../../DEPLOY.md).

## At a glance

- Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS v4 tokens, TanStack Query, React Hook Form + Zod, in `client/`.
- Page files stay tiny and render a feature component from `components/features/`.
- Warm cream and terracotta design system (single light theme), one shared style for every form control, and a Playwright end-to-end suite (`pnpm e2e`).
