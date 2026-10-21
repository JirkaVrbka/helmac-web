# CLAUDE.md - Project Guidelines for Claude Code

> This file contains rules and conventions for Claude Code to follow when working on this project.
> Pattern-specific guidance lives in `.claude/rules/` and loads automatically when matching files are touched.

## Project Overview

**Project:** Helmac Web - Yearly recurring event website with admin dashboard
**Type:** Next.js App Router + TypeScript + MUI + PostgreSQL
**Language:** Czech (UI content only), English (code, comments, variables)

## Tech Stack

| Technology         | Version    | Purpose                                                  |
| ------------------ | ---------- | -------------------------------------------------------- |
| Next.js            | 16.x       | App Router, Server Components, Server Actions, Turbopack |
| React              | 19.x       | UI library (useActionState, useFormStatus)               |
| TypeScript         | 5.x        | Type safety (strict mode)                                |
| MUI                | 5.x        | UI components (with Emotion styling)                     |
| MUI X Date Pickers | 8.x        | Date inputs                                              |
| Tiptap             | 3.x        | Rich text editor (Markdown output via tiptap-markdown)   |
| react-markdown     | 10.x       | Markdown rendering on public pages                       |
| dnd-kit            | 6.x/10.x   | Drag-and-drop sorting                                    |
| PostgreSQL         | -          | Database                                                 |
| Prisma             | 5.x        | ORM, migrations                                          |
| Auth.js            | 5.x (beta) | Admin authentication (Credentials provider)              |
| jose               | 6.x        | Public user JWT authentication                           |
| Zod                | 4.x        | Validation                                               |
| Argon2             | -          | Password hashing                                         |
| dayjs              | -          | Date manipulation                                        |
| Nodemailer         | 8.x        | Email sending                                            |
| notistack          | 3.x        | Toast notifications                                      |
| Cloudflare R2      | -          | File storage (production, S3-compatible)                 |
| Tailwind CSS       | 3.x        | Utility CSS (limited use, MUI primary)                   |

## Code Style

### TypeScript/JavaScript

- **Semicolons:** Always use semicolons
- **Quotes:** Use double quotes for strings (`"hello"`)
- **Indentation:** 4 spaces
- **Trailing commas:** Use in multiline objects/arrays (`"es5"` style)
- **Print width:** 80 characters (Prettier)

```typescript
// Good
const config = {
    name: "Helmac",
    year: 2025,
};

// Bad
const config = {
    name: "Helmac",
    year: 2025,
};
```

### Naming Conventions

- **Files:** kebab-case (`admin-drawer.tsx`, `year-form.tsx`)
- **Components:** PascalCase (`AdminDrawer`, `YearForm`)
- **Functions:** camelCase (`createYear`, `getPageBySlug`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_FILE_SIZE`, `ALLOWED_TYPES`)
- **Database tables:** snake_case via `@@map()` (`users`, `audit_logs`)
- **TypeScript types/interfaces:** PascalCase (`PageContent`, `CreateYearInput`)

### Language in Code

- **Variables, functions, comments:** Always English
- **UI text, labels, messages:** Czech (in strings only)
- **Database content:** Czech

## File Structure

```text
app/
├── (public)/           # Public routes (year-based)
├── admin/              # Admin routes (protected)
├── api/                # API routes
├── fonts/              # Custom fonts
└── layout.tsx          # Root layout

components/
├── ui/                 # Shared UI components
├── admin/              # Admin-specific components
├── forms/              # Form components
└── public/             # Public-facing components

lib/
├── actions/            # Server Actions (one file per entity)
│   └── public/         # Public-facing server actions
├── validators/         # Zod schemas (one file per entity)
├── services/           # Data fetching with React cache()
├── utils/              # Utility functions
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
├── contexts/           # React contexts
├── auth.ts             # Admin auth (NextAuth)
├── auth.config.ts      # Admin auth config (Edge-compatible)
├── public-auth.ts      # Public user auth (JWT)
├── public-auth.config.ts # Public auth config
└── db.ts               # Prisma Client singleton

prisma/
├── schema.prisma       # Database schema
├── migrations/         # Migration files
├── scripts/            # One-off migration/dump scripts
├── seed.ts             # Seed script (reads from seed-data.json)
└── seed-data.json      # Anonymized data dump (committed to git)

styles/theme/           # MUI theme files (admin, public, publicLight, colors)
tests/                  # Playwright E2E tests
```

## Safety Rules for Claude

### ALWAYS ASK BEFORE:

- Running `prisma migrate reset` (deletes all data)
- Running `DROP` or `DELETE` SQL commands
- Deleting files or directories
- Modifying `.env` files
- Force pushing to git
- Running destructive npm commands

### NEVER:

- Expose database credentials or secrets
- Skip validation on user input
- Use unsanitized HTML injection
- Commit sensitive data to git
- Run `--force` flags without explicit permission

## Git Commits

Use simple descriptive messages:

```text
Add login page
Fix year creation validation
Update admin dashboard layout
Remove unused components
```

Before committing: run `npm run lint` and `npm run build`. Don't commit `.env.local` or secrets.

## Important Commands

```bash
# Development
npm run dev                # Start dev server (Turbopack)

# Database
npm run db:migrate         # Create migration (prisma migrate dev)
npm run db:seed            # Seed from prisma/seed-data.json
npm run db:dump            # Dump local DB → prisma/seed-data.json (anonymized)
npm run db:dump -- --production  # Dump from SOURCE_DATABASE_URL instead
npm run db:push            # Push schema without migration
npm run db:generate        # Generate Prisma client
npm run db:studio          # Open Prisma Studio

# Build & Lint
npm run build              # Run migrations + production build
npm run lint               # Run ESLint

# Data Migration
npm run migrate:html-to-md           # Convert HTML content to Markdown
npm run migrate:html-to-md -- --dry-run  # Preview without writing

# Testing
npx playwright test        # Run E2E tests

# Documentation
npm run docs:overview      # Generate docs/overview.html (interactive project guide)
```

## Reference Files

- **Database Schema:** `prisma/schema.prisma`
- **Admin Auth:** `lib/auth.ts`, `lib/auth.config.ts`
- **Public Auth:** `lib/public-auth.ts`, `lib/public-auth.config.ts`
- **Themes:** `styles/theme/adminTheme.ts`, `styles/theme/publicTheme.ts`
- **Prettier Config:** `prettier.config.js`
- **ESLint Config:** `eslint.config.mjs`

## Guidelines

Pattern-specific guidance lives in `.claude/rules/` (loads automatically when matching files are touched).
Cross-cutting guidelines:

- **Hard rules:** `docs/guidelines/hard-rules.md` — non-negotiable safety / dependency / scope rules (destructive ones hook-enforced).
- **Development workflow:** `.claude/rules/development-workflow.md` — per-assignment workflow (plan → delegate via sub-agents → verify → validate → iterate ≤5 → escalate).
- **Reusable components:** `docs/components.md` — advisory index; confirm against the source before reusing.
- **Development records:** `docs/development/records/` — point-in-time history, one record per substantial assignment.
- **Technical levels:** `docs/guidelines/technical-levels.md` — the six levels; your active level is in `.claude/tech-level.local.md`.

## Technical Level & Decision Policy

Your personal technical level is stored per-user in `.claude/tech-level.local.md` (git-ignored, not shared).
It governs how much to explain and when to ask you to decide. Change it only via `/project-architect-tech-level`
(menu + confirm) — never from ordinary chat. Definitions: `docs/guidelines/technical-levels.md`.

**How to work with this project:**

- **Autonomy:** Balanced — edits/writes and safe commands run freely; destructive or irreversible actions prompt first (see `.claude/settings.local.json` allow-list).
- **Commits:** Agents **never** commit — only the user runs `git commit`. Simple descriptive messages. Branch as `feat/<area>-<what>` or `fix/<area>-<what>` (see `.claude/rules/parallel-instances.md`).
- **Definition of done:** `npm run lint` + `npm run build` + `npx playwright test` all green before work is called complete.
- **Hooks:** `.claude/settings.json` wires cross-platform Node guards in `.claude/hooks/` (validate-bash, protect-files, scan-secrets, auto-format, session-check). `build-check.mjs` is a standalone lint+build+test gate.
