---
paths:
    - "lib/actions/**"
---

# Server Actions

## Structure

```typescript
// lib/actions/[entity].ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createEntitySchema } from "@/lib/validators/entity";

export type EntityActionState = {
    error?: {
        fieldName?: string[];
        _form?: string[];
    };
    success?: boolean;
} | null;

export async function createEntity(
    prevState: EntityActionState,
    formData: FormData
): Promise<EntityActionState> {
    // 1. Auth check
    try {
        await requireAdmin();
    } catch {
        return { error: { _form: ["Nemáte oprávnění"] } };
    }

    // 2. Parse and validate
    const rawData = {
        /* extract from formData */
    };
    const validated = createEntitySchema.safeParse(rawData);

    if (!validated.success) {
        return { error: validated.error.flatten().fieldErrors };
    }

    // 3. Database operation
    try {
        await db.entity.create({ data: validated.data });
        revalidatePath("/admin/entities");
    } catch (error) {
        console.error("Failed to create entity:", error);
        return { error: { _form: ["Operace selhala"] } };
    }

    // 4. Redirect (outside try-catch)
    redirect("/admin/entities");
}
```

## Rules

- Always validate with Zod before DB operations
- Always check authentication/authorization first
- Return `{ success, data }` or `{ error }` objects
- Use `revalidatePath()` after mutations
- Use `redirect()` outside try-catch for post-mutation redirects
- Never expose internal errors to users

## Transaction-scoped multi-step actions

For an action that copies/creates many related rows atomically (see `createYearWithReuse` in
`lib/actions/years.ts`), wrap the work in `db.$transaction(async (tx) => { ... }, { timeout: ... })` and pass
`tx` down into any shared helper that also needs to run standalone — e.g. `createDefaultPages(yearId, client =
db)` accepts an optional `PrismaClient | Prisma.TransactionClient` so it works both inside and outside a
transaction.
