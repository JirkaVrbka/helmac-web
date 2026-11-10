# Troubleshooting

## Prisma Issues

- Run `npx prisma generate` after schema changes
- Run `npx prisma db push` for quick prototyping (no migration)
- Check `DATABASE_URL` format for PostgreSQL

## Auth.js Issues

- Ensure `NEXTAUTH_SECRET` is set (32+ chars)
- Ensure `PUBLIC_JWT_SECRET` is set for public auth
- Check `NEXTAUTH_URL` matches your dev URL
- Clear cookies if session issues persist

## MUI SSR Issues

- Wrap app with `AppRouterCacheProvider` from `@mui/material-nextjs/v15-appRouter`
- Use `"use client"` for interactive MUI components

## E2E Tests (Playwright) — isolated test database

E2E tests run against a **separate** database, never the dev data. Setup lives in `tests/`:

- **Test DB:** `helmac_test` in the same Postgres instance as dev. The URL is derived at runtime from
  `DATABASE_URL` (db name swapped to `helmac_test`) by `tests/helpers/test-db-url.ts`; override with
  `TEST_DATABASE_URL` if you need a different target. No `.env` file holds it.
- **Prepared each run** by `tests/global-setup.ts` (Playwright `globalSetup`): `prisma db push`
  (auto-creates `helmac_test` if missing + syncs schema) then `prisma db seed` (baseline: year 2026,
  admin user). Specs still self-plant and clean their own rows.
- **App under test** runs on its **own** server: `npx next dev -p 3100` with `DATABASE_URL` set to the
  test DB (`reuseExistingServer: false`, `baseURL` `http://localhost:3100`) — so a dev server on :3000
  is untouched and never read during tests.
- **`tests/helpers/db.ts`** connects its Prisma client to the test DB too (plant/cleanup hit `helmac_test`).

**Run:** Postgres must be up (`docker compose up -d`), then `npm run test:e2e` (or
`npx playwright test tests/<spec>.spec.ts`). Port `3100` must be free. The run fails fast if `DATABASE_URL`
/`TEST_DATABASE_URL` is unset (config load throws).
