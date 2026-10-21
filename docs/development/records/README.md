# Development Records

Point-in-time history of how **substantial** work was built on this project — one record per substantial
assignment (new feature/subsystem/non-trivial change). **Never edit a record after writing it**; a later
change gets its own record. Skip trivial work (typos, tiny tweaks, dep patch bumps); borderline → ask.
Records are written at the development workflow's finish step. Link to ADRs and the components registry
rather than restating them.

## Template

Copy this as `docs/development/records/NNNN-<slug>.md` (next number in sequence):

```markdown
# NNNN — <Title>

Date: YYYY-MM-DD

## Assignment

<the non-technical "what the user wanted", from this cycle's assignment>

## Approach

<how it was built, in brief>

## Key decisions

- <bullet; link ADRs, e.g. "see docs/guidelines/adr/0003-....md" — do not restate the rationale>

## Outcome & deviations

<result; tests/build status; anything that deviated from the original plan>
```

## Index

<!-- add one line per record, newest last -->

| Record                                       | Date       | Summary                                                                                                                                                                                          |
| -------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [0001](0001-interactive-project-overview.md) | 2026-10-13 | Interactive single-file project overview (`docs/overview.html`): big picture, clickable SVG flows with code modals, and a static-analysis code browser.                                          |
| [0002](0002-reuse-year-content.md)           | 2026-10-19 | Reuse content (pages, homepage steps, news, section types, program days, registration form, V2 email templates) from a previous Year when creating a new one, with id-remap + date re-anchoring. |
