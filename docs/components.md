# Components Registry

> Advisory index of reusable components — NOT the source of truth. Before reusing anything listed here, open
> the linked source file and confirm it still matches (name, signature, behavior). If this file is missing,
> thin, or stale, discover components directly (grep/glob the codebase) and update this file.
> List only genuinely shared/reused components — used, or clearly meant to be used, in ≥2 places. Links are
> relative to this file. Line numbers are approximate — confirm at the source.

> **Check here before writing new logic** (hard rule: prefer reuse). Entity-specific forms, page sections,
> and one-off admin/public components are intentionally omitted. Feature modules below are reusable but scoped.

## Services (`lib/services/` — React `cache()` data fetchers; barrel `index.ts`)

| Component                                                                                                                           | When to use                                                              | Source                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `getActiveYear` / `getActiveYearWithPages` / `getYearById` / `getYearByNumber` / `getArchivedYears` / `getYearRegistrationSettings` | Fetch year(s) + registration settings                                    | [lib/services/years.ts](../lib/services/years.ts)                                                            |
| `getPublishedPageBySlug` / `getPageBySlugForActiveYear` / `getPublishedPagesForYear`                                                | Fetch published CMS pages                                                | [lib/services/pages.ts](../lib/services/pages.ts)                                                            |
| `getPublishedNews` / `getLatestNewsForActiveYear`                                                                                   | Fetch published news                                                     | [lib/services/news.ts](../lib/services/news.ts)                                                              |
| `getAllPublishedAlbums` / `getPublishedAlbums` / `getLatestAlbumsForActiveYear`                                                     | Fetch gallery albums                                                     | [lib/services/gallery.ts](../lib/services/gallery.ts)                                                        |
| `getProgramScheduleForActiveYear` / `getProgramDaysForYear` / `getProgramDayWithEvents` / `getProgramEvent` / `getAllTagsForYear`   | Fetch program schedule/events/tags                                       | [lib/services/program.ts](../lib/services/program.ts)                                                        |
| `getSectionTypesForActiveYear` / `getSectionById` / `getSectionTypeBySlugForActiveYear` / `getFeaturedSectionTypeForActiveYear`     | Fetch content sections                                                   | [lib/services/sections.ts](../lib/services/sections.ts)                                                      |
| `getNavigationData(): Promise<NavigationData>`                                                                                      | Build site navigation                                                    | [lib/services/navigation.ts](../lib/services/navigation.ts)                                                  |
| `getHomepageStepsForActiveYear` / `getHomepageStepsForYear`                                                                         | Homepage "how it works" steps                                            | [lib/services/homepage-steps.ts](../lib/services/homepage-steps.ts)                                          |
| `hasMainEmailAccount` / `hasConfiguredBankAccount` / `getGlobalBankAccount`                                                         | Bank-account config checks                                               | [lib/services/bank-account.ts](../lib/services/bank-account.ts)                                              |
| `buildCampaignPlaceholders(yearId)`                                                                                                 | Mass-email placeholder catalog (not cached)                              | [lib/services/email-campaign.ts](../lib/services/email-campaign.ts)                                          |
| `registration.ts`, `v2.ts`                                                                                                          | Heavy domain data layers (orders/forms) — read before reusing            | [lib/services/registration.ts](../lib/services/registration.ts), [lib/services/v2.ts](../lib/services/v2.ts) |
| `getYearCopyInventory(sourceYearId)`                                                                                                | Counted inventory of a Year's copyable content, for reuse-content picker | [lib/services/year-copy-inventory.ts](../lib/services/year-copy-inventory.ts)                                |

## Utilities (`lib/utils/`)

| Component                                                                                   | When to use                        | Source                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `formatDate` / `formatDateTime` / `formatDateRange` / `formatEventDateRange`                | Czech date formatting              | [lib/utils/date.ts](../lib/utils/date.ts)                                                                                                                                           |
| `generateSlug(text)`                                                                        | URL slug from Czech text           | [lib/utils/slugify.ts](../lib/utils/slugify.ts)                                                                                                                                     |
| `getBaseUrl()`                                                                              | Resolve app base URL               | [lib/utils/url.ts](../lib/utils/url.ts)                                                                                                                                             |
| `storageUrl(path)`                                                                          | Resolve storage / public asset URL | [lib/utils/storage.ts](../lib/utils/storage.ts)                                                                                                                                     |
| `encrypt` / `decrypt`                                                                       | AES string crypto                  | [lib/utils/encryption.ts](../lib/utils/encryption.ts)                                                                                                                               |
| `calculateAge` / `isMinor`                                                                  | Age & minor detection              | [lib/utils/minor-detection.ts](../lib/utils/minor-detection.ts)                                                                                                                     |
| `generateUniqueVariableSymbol()`                                                            | Unique payment variable symbol     | [lib/utils/variable-symbol.ts](../lib/utils/variable-symbol.ts)                                                                                                                     |
| `czechAccountToIBAN` / `generateSPAYD` / `formatCzechAccount`                               | Czech bank / QR payment strings    | [lib/utils/spayd.ts](../lib/utils/spayd.ts)                                                                                                                                         |
| `htmlToMarkdown(html)`                                                                      | HTML → Markdown (turndown)         | [lib/utils/html-to-markdown.ts](../lib/utils/html-to-markdown.ts)                                                                                                                   |
| `extractMarkdownToc` / `buildTocIdMap` (+ `TocItem`)                                        | Markdown table-of-contents         | [lib/utils/markdown-toc-helpers.ts](../lib/utils/markdown-toc-helpers.ts)                                                                                                           |
| `fetchOgImage(url)`                                                                         | Scrape Open Graph image            | [lib/utils/og-image.ts](../lib/utils/og-image.ts)                                                                                                                                   |
| `getCurrentPrice` / `getCurrentTierIndex` / `formatPrice` / `getApplicablePriceFromSummary` | Pricing-tier math                  | [lib/utils/pricing.ts](../lib/utils/pricing.ts)                                                                                                                                     |
| `computePricingLineItems` / `computePricingSummary` / `resolveSubmissionDataForDisplay`     | Registration pricing breakdown     | [lib/utils/pricing-line-items.ts](../lib/utils/pricing-line-items.ts), [pricing-summary.ts](../lib/utils/pricing-summary.ts), [pricing-display.ts](../lib/utils/pricing-display.ts) |
| `evaluateCondition` / `buildVisibleFieldIds` / `migrateFormData`                            | Dynamic-form condition logic       | [lib/utils/condition-evaluation.ts](../lib/utils/condition-evaluation.ts), [visible-fields.ts](../lib/utils/visible-fields.ts), [form-migration.ts](../lib/utils/form-migration.ts) |
| `richContentSx` / `paperGrainSx` / `vignetteSx` / `goldShimmerSx` / `grainyMask*`           | Shared MUI `sx` styling objects    | [lib/utils/rich-content-sx.ts](../lib/utils/rich-content-sx.ts), [texture-overlay.ts](../lib/utils/texture-overlay.ts), [grainy-mask.ts](../lib/utils/grainy-mask.ts)               |

**Backend/domain orchestration utils** (reusable but not primitives — read before reusing): email senders & `replacePlaceholders`/`buildPlaceholders` [lib/utils/email.ts](../lib/utils/email.ts); email queue `processEmailQueue`/`kickEmailQueue` [lib/utils/email-queue.ts](../lib/utils/email-queue.ts) (see `.claude/rules/email-queue.md`); FIO bank API [lib/utils/fio-api.ts](../lib/utils/fio-api.ts); payment matching/sync [lib/utils/payment-matching.ts](../lib/utils/payment-matching.ts), [sync-payments.ts](../lib/utils/sync-payments.ts); V2 dual-write [lib/utils/v2-dual-write.ts](../lib/utils/v2-dual-write.ts).

## Shared UI

| Component                                                           | When to use                                         | Source                                                                                  |
| ------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `MarkdownContent`                                                   | Render markdown, MUI-styled, TOC-aware (7 uses)     | [components/ui/markdown-content.tsx](../components/ui/markdown-content.tsx)             |
| `LinkButton` / `IconLinkButton` / `ListItemLinkButton`              | MUI button/icon rendered as Next `<Link>` (39 uses) | [components/ui/link-button.tsx](../components/ui/link-button.tsx)                       |
| `DatePickerProvider`                                                | MUI x-date-pickers `cs` localization wrapper        | [components/ui/date-picker-provider.tsx](../components/ui/date-picker-provider.tsx)     |
| `Section` / `SectionTitle` / `PageHeader` / `HeroSection` / `Card`  | Public page layout primitives (barrel)              | [components/public/ui/index.ts](../components/public/ui/index.ts)                       |
| `AnimatedSection`                                                   | Reveal-on-scroll wrapper (respects reduced-motion)  | [components/public/ui/AnimatedSection.tsx](../components/public/ui/AnimatedSection.tsx) |
| `FilterChips` (+ `FilterChipItem`)                                  | Single-select chip filter row                       | [components/public/ui/FilterChips.tsx](../components/public/ui/FilterChips.tsx)         |
| `DecorativeDivider` / `ParchmentCallout` / `OrnamentalUnderline`    | Themed decorative elements                          | [components/public/ui/Divider.tsx](../components/public/ui/Divider.tsx)                 |
| `AccountStatTile` / `ThemeToggle` / `ScrollToTop` / `CookieConsent` | Account/chrome public widgets                       | [components/public/ui/](../components/public/ui/)                                       |
| `PageHeader` (admin)                                                | Admin breadcrumb + title header (50 uses)           | [components/admin/page-header.tsx](../components/admin/page-header.tsx)                 |
| `RichTextEditor`                                                    | TipTap rich editor, markdown/html output (13 uses)  | [components/admin/rich-text-editor.tsx](../components/admin/rich-text-editor.tsx)       |
| `ListFilters`                                                       | URL-synced search/filter bar (6 uses)               | [components/admin/list-filters.tsx](../components/admin/list-filters.tsx)               |
| `IconPicker`                                                        | Icon selection dialog (5 uses)                      | [components/admin/icon-picker.tsx](../components/admin/icon-picker.tsx)                 |
| `SortableList<T>`                                                   | Generic dnd-kit sortable list (4 uses)              | [components/admin/sortable-list.tsx](../components/admin/sortable-list.tsx)             |
| `ImageUploader`                                                     | Image upload with preview (4 uses)                  | [components/admin/image-uploader.tsx](../components/admin/image-uploader.tsx)           |

**Feature modules (reusable but scoped):** `components/admin/block-editor/` and `components/admin/form-builder/` (barrel `index.ts` each) — editor internals; dynamic registration form primitives `DynamicFormField` / `DynamicRegistrationForm` under [components/public/features/registration/](../components/public/features/registration/).

**Year reuse-content flow (`components/forms/`):** `YearNewForm` — single unified client form driving `app/admin/rocniky/novy/page.tsx`. A client Select picks the source year; its `onChange` calls `loadYearCopyInventory(sourceYearId)` to load the copy-inventory on demand (no page reload), and the `ReuseSection` subsection (per-category checklists, conditional-template disabling, anchor-date field, single selection-JSON hidden input, keyed by `sourceYearId`) renders the selection. Source: [components/forms/year-new-form.tsx](../components/forms/year-new-form.tsx).

> **Note on forms:** `components/forms/` holds mostly entity-specific forms (login, year, user, …), no generic primitives — the `SourceYearPicker` / `YearCreateForm` pair above is the one scoped-but-reusable exception (reused together, not standalone). There is no shared `FormField`/`SubmitButton` — reusable form-building lives in `form-builder/` and the registration feature module above. See `.claude/rules/forms.md` and `.claude/rules/form-builder.md`.

## Hooks

| Component                                                        | When to use                       | Source                                              |
| ---------------------------------------------------------------- | --------------------------------- | --------------------------------------------------- |
| `useToast()` → `{ success, error, info, warning, toast, close }` | Notistack toast wrapper (15 uses) | [lib/hooks/use-toast.ts](../lib/hooks/use-toast.ts) |

## Contexts

| Component                                                                                | When to use                                                                                  | Source                                                                  |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `SidebarContextProvider` / `useSidebarContext()` (+ `SidebarYearData`, `BreadcrumbItem`) | Admin sidebar year + breadcrumb state                                                        | [lib/contexts/sidebar-context.tsx](../lib/contexts/sidebar-context.tsx) |
| `ThemeModeProvider` / `useThemeMode()` → `{ mode, toggleTheme, isDark }`                 | Dark/light mode (cookie + localStorage). Lives in top-level `contexts/`, not `lib/contexts/` | [contexts/ThemeContext.tsx](../contexts/ThemeContext.tsx)               |

## Middleware

| Component                             | When to use                                                                                                                                     | Source                  |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `proxy(request)` (+ `config.matcher`) | Edge middleware: Auth.js for `/admin`, public JWT verify for `/ucet`, `/prihlaseni`, `/vytvorit-ucet`. No `middleware.ts` — entry is `proxy.ts` | [proxy.ts](../proxy.ts) |
