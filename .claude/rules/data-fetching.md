---
paths:
    - "lib/services/**"
---

# Data Fetching - Service Pattern

```typescript
// lib/services/[entity].ts
import { cache } from "react";
import { db } from "@/lib/db";

export const getActiveYear = cache(async () => {
    return db.year.findFirst({
        where: { isActive: true, isArchived: false },
    });
});

export const getEntityById = cache(async (id: string) => {
    return db.entity.findUnique({
        where: { id },
        select: {
            /* only needed fields */
        },
    });
});
```

- Use React `cache()` to deduplicate requests within a render
- Place in `lib/services/` (one file per entity)
- Use `select` to include only needed fields

## Inventory services

A service can also return a counted/flagged **inventory** of another entity's child records, for admin UIs
that let the user pick which items to act on (checkbox lists, etc.) — see `getYearCopyInventory(sourceYearId)`
in `lib/services/year-copy-inventory.ts`, which still follows the plain `cache()` pattern above.
