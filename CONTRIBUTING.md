# Contributing to Aria Console

Thanks for your interest in contributing! This document covers the basics.

## Development setup

1. Fork and clone the repo
2. `bun install`
3. `cp .env.example .env`
4. `bun run db:generate && bun run db:push && bun run db:seed`
5. `bun run dev`

## Code style

- TypeScript strict mode (no `any` unless absolutely necessary)
- Functional React components with hooks
- Tailwind utility classes — no CSS modules
- shadcn/ui primitives over custom components
- Lucide icons (consistent stroke width)
- Use `cn()` from `@/lib/utils` for conditional class names

## Commit conventions

We follow a loose Conventional Commits style:

- `feat(scope): description` — new feature
- `fix(scope): description` — bug fix
- `chore(scope): description` — build, deps, config
- `docs(scope): description` — documentation only
- `refactor(scope): description` — code restructure, no behavior change
- `test(scope): description` — test additions or fixes

Common scopes: `api`, `dashboard`, `lib`, `hooks`, `prisma`, `supabase`, `app`, `ui`.

## Pull requests

1. Create a feature branch: `git checkout -b feat/my-feature`
2. Make your changes with clear commits
3. Run `bun run lint` and fix any warnings
4. Test your changes locally
5. Open a PR with a clear description

## Adding a new device type

1. Add the type to the `DeviceType` enum in `prisma/schema.prisma`
2. Add an icon mapping in `src/components/dashboard/device-monitoring.tsx` and `device-type-breakdown.tsx`
3. Add a label in `typeLabels` map
4. Run `bun run db:push` to apply the schema change
5. Update `supabase/migrations/0002_devices.sql` to match (for production)

## Adding a new API endpoint

1. Create `src/app/api/<resource>/route.ts`
2. Use `db` from `@/lib/db` for database access
3. Return `NextResponse.json()` with proper status codes
4. Add error handling with `try/catch`
5. Document the endpoint in `README.md`

## Reporting bugs

Open an issue with:
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Browser and OS info
