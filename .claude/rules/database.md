---
paths:
    - "prisma/**"
---

# Database (Prisma)

## Schema Conventions

- Use `cuid()` for IDs
- Include `createdAt` and `updatedAt` on all models
- Use `@@map("table_name")` for snake_case table names
- Define relations explicitly
- Use `Json` type for flexible/dynamic data (form definitions, submissions, pricing)

## Migrations

- Run `npm run db:migrate` (or `npx prisma migrate dev --name descriptive-name`)
- Run `npx prisma migrate deploy` for production
- Never edit migration files manually

## Queries

- Use Prisma Client only (`db.model.method()`)
- Never use `$queryRaw` or `$executeRaw` with user input
- Include only needed fields with `select`
- Use transactions for multi-step operations

## Content-copy / id-remap pattern

When duplicating a tree of related rows into a new parent (e.g. copying one Year's pages/sections/forms into a
newly created Year), run the whole copy inside one `db.$transaction` (interactive transaction, needs a raised
`timeout`), and keep an in-memory `Map<oldId, newId>` per entity type as each row is recreated so child rows can
remap their foreign keys to the new parent's ids. Re-anchor any copied dates by a fixed millisecond delta
(`computeDeltaMs`/`shiftDate`) rather than naive "+1 year", so weekday offsets and time-of-day are preserved.
Reference implementation: `lib/utils/year-copy.ts` (`copyYearContent`), used by `createYearWithReuse` in
`lib/actions/years.ts`.
