---
paths:
    - "components/forms/**"
---

# Forms (React 19)

Uses `useActionState` from React 19, **NOT** the deprecated `useFormState` from `react-dom`.

## Pattern

```typescript
// components/forms/EntityForm.tsx
"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createEntity } from "@/lib/actions/entities";

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" variant="contained" disabled={pending}>
            {pending ? <CircularProgress size={24} /> : "Uložit"}
        </Button>
    );
}

export function EntityForm() {
    const [state, formAction] = useActionState(createEntity, null);

    return (
        <Box component="form" action={formAction}>
            {state?.error?._form && (
                <Alert severity="error">{state.error._form[0]}</Alert>
            )}
            <TextField
                name="fieldName"
                error={!!state?.error?.fieldName}
                helperText={state?.error?.fieldName?.[0]}
            />
            <SubmitButton />
        </Box>
    );
}
```

## On-demand source selection + selection-JSON hidden input

For a flow that branches a form on a picked "source" record (e.g. picking a year to reuse content from), a
single unified client form renders the whole create flow — see `components/forms/year-new-form.tsx`
(`YearNewForm`), which drives `app/admin/rocniky/novy/page.tsx`. The source year is chosen via a client `Select`;
its `onChange` calls the server action `loadYearCopyInventory(sourceYearId)` (in `lib/actions/years.ts`) to fetch
the copy-inventory **on demand** into client state — no page reload, so already-typed fields and photos persist.
The content-selection subsection (`ReuseSection`) is mounted with `key={sourceYearId}` so switching source resets
only the selection, not identity/photos.

For a complex multi-category selection (checklists across several entity types), serialize the whole selection to
one hidden `<input type="hidden" name="selection" value={JSON.stringify(...)} />` and validate it server-side with
a single Zod schema (`yearCopySelectionSchema` in `lib/validators/year.ts`) rather than one form field per item.

Submit goes through one server action `createYear` that branches on whether `sourceYearId` is present (blank
create vs copy-from-year). Photos (`headerPhoto` / `heroPhoto`) are always set manually via `ImageUploader` —
never copied between years.
