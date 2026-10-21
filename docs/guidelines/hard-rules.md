# Hard Rules

> Non-negotiable rules for all work on this repo. These consolidate the safety rules already in
> `CLAUDE.md` (## Safety Rules) and `.claude/rules/security.md`, and add supply-chain / scope guardrails.
> The destructive ones are enforced by hooks in `.claude/hooks/` (see `.claude/settings.json`).

## Enforced by hooks

- **No destructive shell.** `rm -rf`, `git push --force`, `git reset --hard`, `git clean -f`, and the
  Windows equivalents (`del /s`, `Remove-Item -Recurse -Force`) are blocked by `validate-bash.mjs`.
  Need the effect? Use a safer path (targeted delete, `git revert`, a new branch).
- **No writes to secrets.** Writing `.env*`, `*.key`, `*.pem`, `secrets.*`, or any path outside the
  project is blocked by `protect-files.mjs`. Change secrets by hand, outside the agent.
- **Secret scan.** `scan-secrets.mjs` warns when a just-written file contains a hardcoded API key,
  token, PEM block, or JWT. Move it to an env var before continuing.

## Always-ask (never do without explicit human approval)

These mirror `CLAUDE.md` → ## Safety Rules → ALWAYS ASK BEFORE:

- `prisma migrate reset`, `DROP`/`DELETE` SQL, deleting files/directories, modifying `.env*`,
  force-pushing, or any destructive npm command.
- **No deploy or production-config change** without explicit human approval.
- **Agents never commit.** Only the user runs `git commit` in this project.

## Code & dependency discipline

- **No secrets in code or config** — env vars only; `.env*` is git-ignored. (See `.claude/rules/security.md`.)
- **Validate all user input** with Zod — never skip validation (see `.claude/rules/server-actions.md`,
  `.claude/rules/forms.md`). No unsanitized HTML injection.
- **14-day dependency rule.** Do not add a dependency published less than 14 days ago without approval
  (supply-chain safety).
- **Prefer reuse.** Check for an existing service/util/component before writing new logic — see
  `docs/components.md` and `.claude/rules/data-fetching.md`. Rule of Three before abstracting.
- **Keep slices small.** Vertical slices of roughly ≤ 400 lines of logic diff; split larger work.
- **Verify before asserting.** Claim something works only after running `npm run lint`, `npm run build`,
  and (when relevant) `npx playwright test` — the definition of done (see `.claude/rules/development-workflow.md`).

## Related

- `CLAUDE.md` — ## Safety Rules, ## Git Commits
- `.claude/rules/security.md`, `.claude/rules/server-actions.md`, `.claude/rules/database.md`
- `.claude/rules/development-workflow.md` — per-assignment workflow and definition of done
