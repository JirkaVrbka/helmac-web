import { getAllInputFields } from "@/lib/types/registration-form";
import { migrateFormData } from "@/lib/utils/form-migration";
import type {
    RegistrationFormData,
    InputField,
    PricingDefinition,
    PricedOption,
    FormCondition,
    CapacityLimit,
    AdditionalPersonData,
} from "@/lib/types/registration-form";
import type { EmailConditionalSection } from "@/lib/types/email-sections";
import { parseQuantities, parseSelected } from "@/lib/utils/pricing-field-values";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxClient = any;

// ============================================================
// Catalog sync (form builder save)
// ============================================================

export async function syncFormCatalogToV2(
    tx: TxClient,
    formId: string,
    yearId: string,
    formData: RegistrationFormData,
): Promise<void> {
    const allInputFields = getAllInputFields(formData.fields);

    // Step 1: Soft-delete all existing items for this form.
    // Items that are still present will be re-activated in the upsert steps.
    await tx.v2PricingDefinition.updateMany({
        where: { formId },
        data: { isActive: false },
    });
    await tx.v2PricingOption.updateMany({
        where: { definition: { formId } },
        data: { isActive: false },
    });
    await tx.v2FormField.updateMany({
        where: { formId },
        data: { isActive: false },
    });

    // Step 2: Upsert price tiers
    const tierIds = await syncPriceTiers(
        tx,
        formId,
        yearId,
        formData.priceTiers ?? [],
    );

    // Step 3: Upsert pricing definitions → options → option prices
    const defIdMap = await syncPricingDefinitions(
        tx,
        formId,
        yearId,
        formData.pricingDefinitions,
        tierIds,
    );

    // Step 4: Upsert form fields
    const fieldIdMap = await syncFormFields(
        tx,
        formId,
        yearId,
        allInputFields,
        defIdMap,
    );

    // Step 5: Upsert conditions → rules
    await syncFormConditions(
        tx,
        formId,
        yearId,
        formData.conditions,
        fieldIdMap,
    );

    // Step 6: Upsert capacity limits
    await syncCapacityLimitsToV2(
        tx,
        formId,
        yearId,
        formData.capacityLimits,
        fieldIdMap,
    );

    // Step 7: Resync email templates — their sections may
    // reference conditions/fields that were just upserted.
    await resyncEmailTemplates(tx, yearId, formId, fieldIdMap);
}

// ---- Price tiers ----

async function syncPriceTiers(
    tx: TxClient,
    formId: string,
    yearId: string,
    priceTiers: string[],
): Promise<string[]> {
    const tierIds: string[] = [];

    for (let i = 0; i < priceTiers.length; i++) {
        const tier = await tx.v2PriceTier.upsert({
            where: {
                formId_sortOrder: { formId, sortOrder: i },
            },
            create: {
                formId,
                yearId,
                deadline: new Date(priceTiers[i]),
                sortOrder: i,
            },
            update: {
                deadline: new Date(priceTiers[i]),
            },
        });
        tierIds.push(tier.id);
    }

    // Fallback tier (deadline = null, after all dated tiers)
    const fallbackSortOrder = priceTiers.length;
    const fallback = await tx.v2PriceTier.upsert({
        where: {
            formId_sortOrder: { formId, sortOrder: fallbackSortOrder },
        },
        create: {
            formId,
            yearId,
            deadline: null,
            sortOrder: fallbackSortOrder,
        },
        update: { deadline: null },
    });
    tierIds.push(fallback.id);

    // Remove excess tiers if the count decreased
    await tx.v2PriceTier.deleteMany({
        where: { formId, sortOrder: { gt: fallbackSortOrder } },
    });

    return tierIds;
}

// ---- Pricing definitions & options ----

async function syncPricingDefinitions(
    tx: TxClient,
    formId: string,
    yearId: string,
    definitions: PricingDefinition[],
    tierIds: string[],
): Promise<Record<string, string>> {
    const defIdMap: Record<string, string> = {};

    const existingDefs = await tx.v2PricingDefinition.findMany({
        where: { formId },
        include: { options: true },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const defsByLegacyId = new Map<string, any>(
        existingDefs
            .filter((d: { legacyId: string | null }) => d.legacyId)
            .map((d: { legacyId: string; id: string }) => [
                d.legacyId,
                d,
            ] as [string, unknown]),
    );

    for (let di = 0; di < definitions.length; di++) {
        const def = definitions[di];
        const existing = defsByLegacyId.get(def.id);

        const defData = {
            name: def.name,
            type: def.type ?? "options",
            multiSelect: def.multiSelect ?? false,
            unitName: def.unitName ?? null,
            usePriceTiers: def.usePriceTiers,
            isActive: true,
            sortOrder: di,
        };

        let v2DefId: string;
        if (existing) {
            await tx.v2PricingDefinition.update({
                where: { id: existing.id },
                data: defData,
            });
            v2DefId = existing.id;
        } else {
            const created = await tx.v2PricingDefinition.create({
                data: {
                    ...defData,
                    legacyId: def.id,
                    formId,
                    yearId,
                },
            });
            v2DefId = created.id;
        }
        defIdMap[def.id] = v2DefId;

        await syncPricingOptions(
            tx,
            v2DefId,
            def,
            tierIds,
            existing?.options ?? [],
        );
    }

    return defIdMap;
}

async function syncPricingOptions(
    tx: TxClient,
    v2DefId: string,
    def: PricingDefinition,
    tierIds: string[],
    existingOptions: { id: string; legacyId: string | null }[],
): Promise<void> {
    const optsByLegacyId = new Map(
        existingOptions
            .filter((o) => o.legacyId)
            .map((o) => [o.legacyId!, o]),
    );

    for (let oi = 0; oi < def.options.length; oi++) {
        const option = def.options[oi];
        const existing = optsByLegacyId.get(option.id);

        const optData = {
            name: option.name,
            description: option.description ?? "",
            isActive: true,
            sortOrder: oi,
        };

        let v2OptId: string;
        if (existing) {
            await tx.v2PricingOption.update({
                where: { id: existing.id },
                data: optData,
            });
            v2OptId = existing.id;
        } else {
            const created = await tx.v2PricingOption.create({
                data: {
                    ...optData,
                    legacyId: option.id,
                    definitionId: v2DefId,
                },
            });
            v2OptId = created.id;
        }

        await syncOptionPrices(tx, v2OptId, option, def, tierIds);
    }
}

async function syncOptionPrices(
    tx: TxClient,
    v2OptId: string,
    option: PricedOption,
    def: PricingDefinition,
    tierIds: string[],
): Promise<void> {
    for (let pi = 0; pi < tierIds.length; pi++) {
        const price = def.usePriceTiers
            ? (option.prices[pi] ?? 0)
            : (option.prices[0] ?? 0);

        await tx.v2PricingOptionPrice.upsert({
            where: {
                optionId_tierId: {
                    optionId: v2OptId,
                    tierId: tierIds[pi],
                },
            },
            create: {
                optionId: v2OptId,
                tierId: tierIds[pi],
                price,
            },
            update: { price },
        });
    }
}

// ---- Form fields ----

async function syncFormFields(
    tx: TxClient,
    formId: string,
    yearId: string,
    allInputFields: InputField[],
    defIdMap: Record<string, string>,
): Promise<Record<string, string>> {
    const fieldIdMap: Record<string, string> = {};

    const existingFields = await tx.v2FormField.findMany({
        where: { formId },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fieldsByLegacyId = new Map<string, any>(
        existingFields
            .filter(
                (f: { legacyId: string | null }) => f.legacyId,
            )
            .map(
                (f: { legacyId: string; id: string }) => [
                    f.legacyId,
                    f,
                ] as [string, unknown],
            ),
    );

    for (let fi = 0; fi < allInputFields.length; fi++) {
        const field = allInputFields[fi];
        const existing = fieldsByLegacyId.get(field.id);

        const pricingDefId = field.pricingId
            ? (defIdMap[field.pricingId] ?? null)
            : null;

        const fieldData = {
            name: field.name,
            label: field.label,
            type: field.type,
            required: field.required,
            editable: field.editable ?? false,
            pricingDefinitionId: pricingDefId,
            includeForAdditionalPeople:
                field.includeForAdditionalPeople ?? false,
            options: field.options ?? [],
            isActive: true,
            sortOrder: fi,
        };

        let v2FieldId: string;
        if (existing) {
            await tx.v2FormField.update({
                where: { id: existing.id },
                data: fieldData,
            });
            v2FieldId = existing.id;
        } else {
            const created = await tx.v2FormField.create({
                data: {
                    ...fieldData,
                    legacyId: field.id,
                    formId,
                    yearId,
                },
            });
            v2FieldId = created.id;
        }
        fieldIdMap[field.id] = v2FieldId;
    }

    return fieldIdMap;
}

// ---- Form conditions & rules ----

async function syncFormConditions(
    tx: TxClient,
    formId: string,
    yearId: string,
    conditions: FormCondition[],
    fieldIdMap: Record<string, string>,
): Promise<void> {
    const existingConds = await tx.v2FormCondition.findMany({
        where: { formId },
        include: { rules: { orderBy: { sortOrder: "asc" } } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const condsByLegacyId = new Map<string, any>(
        existingConds
            .filter(
                (c: { legacyId: string | null }) => c.legacyId,
            )
            .map(
                (c: { legacyId: string; id: string }) => [
                    c.legacyId,
                    c,
                ] as [string, unknown],
            ),
    );

    for (let ci = 0; ci < conditions.length; ci++) {
        const cond = conditions[ci];
        const existing = condsByLegacyId.get(cond.id);

        let v2CondId: string;
        if (existing) {
            await tx.v2FormCondition.update({
                where: { id: existing.id },
                data: { name: cond.name, sortOrder: ci },
            });
            v2CondId = existing.id;
        } else {
            const created = await tx.v2FormCondition.create({
                data: {
                    legacyId: cond.id,
                    formId,
                    yearId,
                    name: cond.name,
                    sortOrder: ci,
                },
            });
            v2CondId = created.id;
        }

        await syncConditionRules(
            tx,
            v2CondId,
            cond.rules,
            fieldIdMap,
            existing?.rules ?? [],
        );
    }
}

async function syncConditionRules(
    tx: TxClient,
    conditionId: string,
    rules: FormCondition["rules"],
    fieldIdMap: Record<string, string>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    existingRules: any[],
): Promise<void> {
    for (let ri = 0; ri < rules.length; ri++) {
        const rule = rules[ri];
        const existing = existingRules[ri];

        const fieldId = rule.fieldId
            ? (fieldIdMap[rule.fieldId] ?? null)
            : null;

        const ruleData = {
            fieldId,
            operator: rule.operator ?? "equals",
            value: rule.value ?? null,
            connector: rule.connector ?? "AND",
            sortOrder: ri,
        };

        if (existing) {
            await tx.v2FormConditionRule.update({
                where: { id: existing.id },
                data: ruleData,
            });
        } else {
            await tx.v2FormConditionRule.create({
                data: { ...ruleData, conditionId },
            });
        }
    }

    // Remove excess rules if the count decreased
    if (existingRules.length > rules.length) {
        const excessIds = existingRules
            .slice(rules.length)
            .map((r: { id: string }) => r.id);
        await tx.v2FormConditionRule.deleteMany({
            where: { id: { in: excessIds } },
        });
    }
}

// ---- Capacity limits ----

export async function syncCapacityLimitsToV2(
    tx: TxClient,
    formId: string,
    yearId: string,
    capacityLimits: CapacityLimit[],
    fieldIdMap: Record<string, string>,
): Promise<void> {
    const touchedIds: string[] = [];

    for (const limit of capacityLimits) {
        const v2FieldId = fieldIdMap[limit.fieldId];
        if (!v2FieldId) continue;

        const row = await tx.v2CapacityLimit.upsert({
            where: {
                formId_fieldId_optionValue: {
                    formId,
                    fieldId: v2FieldId,
                    optionValue: limit.value,
                },
            },
            create: {
                legacyId: limit.id,
                formId,
                yearId,
                fieldId: v2FieldId,
                optionValue: limit.value,
                maxCount: limit.maxCount,
            },
            update: {
                maxCount: limit.maxCount,
                legacyId: limit.id,
            },
        });
        touchedIds.push(row.id);
    }

    // Remove stale limits no longer in the set
    if (touchedIds.length > 0) {
        await tx.v2CapacityLimit.deleteMany({
            where: { formId, id: { notIn: touchedIds } },
        });
    } else {
        await tx.v2CapacityLimit.deleteMany({
            where: { formId },
        });
    }
}

// ---- Email template resync ----

async function resyncEmailTemplates(
    tx: TxClient,
    yearId: string,
    _formId: string,
    fieldIdMap: Record<string, string>,
): Promise<void> {
    // Resync conditional email sections — their inline
    // conditions reference form fields by v2 ID. We update
    // the v2_form_condition_rules that point to old field IDs.
    const condRules = await tx.v2FormConditionRule.findMany({
        where: {
            condition: {
                OR: [
                    { emailTemplates: { some: { yearId } } },
                    { emailSections: { some: { template: { yearId } } } },
                ],
            },
        },
    });

    for (const rule of condRules) {
        if (!rule.fieldId) continue;
        // Find if this field was remapped
        const field = await tx.v2FormField.findUnique({
            where: { id: rule.fieldId },
            select: { legacyId: true },
        });
        if (field?.legacyId && fieldIdMap[field.legacyId]) {
            const newFieldId = fieldIdMap[field.legacyId];
            if (newFieldId !== rule.fieldId) {
                await tx.v2FormConditionRule.update({
                    where: { id: rule.id },
                    data: { fieldId: newFieldId },
                });
            }
        }
    }
}

// ============================================================
// Year-level email template sync
// ============================================================

export type EmailType = "confirmation" | "payment" | "price_change";

export async function syncYearEmailToV2(
    tx: TxClient,
    yearId: string,
    type: EmailType,
    data: {
        subject: string | null;
        body: string | null;
        bcc: string | null;
        accountId: string | null;
        sections: unknown;
        attachments: unknown;
    },
): Promise<void> {
    const existing = await tx.v2EmailTemplate.findFirst({
        where: { yearId, type },
        include: { sections: { orderBy: { sortOrder: "asc" } } },
    });

    const templateData = {
        subject: data.subject,
        body: data.body,
        bcc: data.bcc,
        accountId: data.accountId,
        attachments: (data.attachments as unknown[]) ?? [],
    };

    let templateId: string;
    if (existing) {
        await tx.v2EmailTemplate.update({
            where: { id: existing.id },
            data: templateData,
        });
        templateId = existing.id;
    } else {
        const enabledKey: Record<EmailType, string> = {
            confirmation: "confirmationEmailEnabled",
            payment: "paymentEmailEnabled",
            price_change: "priceChangeEmailEnabled",
        };
        const year = await tx.year.findUnique({
            where: { id: yearId },
            select: { [enabledKey[type]]: true },
        });
        const enabled =
            (year as Record<string, boolean> | null)?.[
                enabledKey[type]
            ] ?? false;
        const created = await tx.v2EmailTemplate.create({
            data: {
                ...templateData,
                yearId,
                type,
                name: "",
                enabled,
            },
        });
        templateId = created.id;
    }

    await syncEmailSections(
        tx,
        templateId,
        yearId,
        data.sections,
        existing?.sections ?? [],
    );
}

export async function toggleYearEmailInV2(
    tx: TxClient,
    yearId: string,
    type: EmailType,
    enabled: boolean,
): Promise<void> {
    const result = await tx.v2EmailTemplate.updateMany({
        where: { yearId, type },
        data: { enabled },
    });
    if (result.count === 0) {
        await tx.v2EmailTemplate.create({
            data: {
                yearId,
                type,
                name: "",
                enabled,
                subject: null,
                body: null,
                bcc: null,
                accountId: null,
                attachments: [],
            },
        });
    }
}

// ---- Email sections ----

async function syncEmailSections(
    tx: TxClient,
    templateId: string,
    yearId: string,
    rawSections: unknown,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    existingSections: any[],
): Promise<void> {
    const sections = Array.isArray(rawSections)
        ? (rawSections as EmailConditionalSection[])
        : [];

    for (let si = 0; si < sections.length; si++) {
        const section = sections[si];
        const existing = existingSections[si];

        let conditionId: string | null = null;
        if (section.condition?.rules?.length > 0) {
            conditionId = await upsertInlineCondition(
                tx,
                yearId,
                section.condition,
                existing?.conditionId ?? null,
            );
        }

        const sectionData = {
            conditionId,
            body: section.body ?? "",
            attachments: (section.attachments as unknown[]) ?? [],
            sortOrder: section.sortOrder ?? si,
        };

        if (existing) {
            await tx.v2EmailSection.update({
                where: { id: existing.id },
                data: sectionData,
            });
        } else {
            await tx.v2EmailSection.create({
                data: { ...sectionData, templateId },
            });
        }
    }

    // Remove excess sections
    if (existingSections.length > sections.length) {
        const excessIds = existingSections
            .slice(sections.length)
            .map((s: { id: string }) => s.id);
        await tx.v2EmailSection.deleteMany({
            where: { id: { in: excessIds } },
        });
    }
}

async function upsertInlineCondition(
    tx: TxClient,
    yearId: string,
    condition: FormCondition,
    existingCondId: string | null,
): Promise<string> {
    // Look up v2 field IDs for the condition rules
    const year = await tx.year.findUnique({
        where: { id: yearId },
        select: { registrationForm: { select: { id: true } } },
    });
    const formId = year?.registrationForm?.id;

    let condId: string;
    if (existingCondId) {
        await tx.v2FormCondition.update({
            where: { id: existingCondId },
            data: { name: condition.name || "" },
        });
        condId = existingCondId;

        // Upsert rules by sortOrder
        const existingRules = await tx.v2FormConditionRule.findMany({
            where: { conditionId: condId },
            orderBy: { sortOrder: "asc" },
        });
        for (let ri = 0; ri < condition.rules.length; ri++) {
            const rule = condition.rules[ri];
            const fieldId = await resolveFieldId(
                tx,
                formId,
                rule.fieldId,
            );
            const ruleData = {
                fieldId,
                operator: rule.operator ?? "equals",
                value: rule.value ?? null,
                connector: rule.connector ?? "AND",
                sortOrder: ri,
            };
            if (existingRules[ri]) {
                await tx.v2FormConditionRule.update({
                    where: { id: existingRules[ri].id },
                    data: ruleData,
                });
            } else {
                await tx.v2FormConditionRule.create({
                    data: { ...ruleData, conditionId: condId },
                });
            }
        }
        if (existingRules.length > condition.rules.length) {
            const excessIds = existingRules
                .slice(condition.rules.length)
                .map((r: { id: string }) => r.id);
            await tx.v2FormConditionRule.deleteMany({
                where: { id: { in: excessIds } },
            });
        }
    } else {
        const created = await tx.v2FormCondition.create({
            data: {
                legacyId: condition.id,
                formId: formId ?? "",
                yearId,
                name: condition.name || "",
                sortOrder: 0,
            },
        });
        condId = created.id;

        for (let ri = 0; ri < condition.rules.length; ri++) {
            const rule = condition.rules[ri];
            const fieldId = await resolveFieldId(
                tx,
                formId,
                rule.fieldId,
            );
            await tx.v2FormConditionRule.create({
                data: {
                    conditionId: condId,
                    fieldId,
                    operator: rule.operator ?? "equals",
                    value: rule.value ?? null,
                    connector: rule.connector ?? "AND",
                    sortOrder: ri,
                },
            });
        }
    }

    return condId;
}

async function resolveFieldId(
    tx: TxClient,
    formId: string | null | undefined,
    legacyFieldId: string | undefined,
): Promise<string | null> {
    if (!legacyFieldId || !formId) return null;
    const field = await tx.v2FormField.findFirst({
        where: { formId, legacyId: legacyFieldId },
        select: { id: true },
    });
    return field?.id ?? null;
}

// ============================================================
// Conditional email sync
// ============================================================

export async function syncConditionalEmailToV2(
    tx: TxClient,
    conditionalEmailId: string,
    yearId: string,
    formId: string,
    data: {
        name: string;
        conditionFieldId: string;
        conditionOperator: string;
        conditionValue: string | null;
        enabled?: boolean;
        subject?: string | null;
        body?: string | null;
        bcc?: string | null;
        accountId?: string | null;
        sections?: unknown;
        attachments?: unknown;
        sortOrder?: number;
    },
): Promise<void> {
    const fieldId = await resolveFieldId(
        tx,
        formId,
        data.conditionFieldId,
    );

    // Find existing v2 condition by legacyId (= old conditionalEmail.id)
    const existingCond = await tx.v2FormCondition.findFirst({
        where: { formId, legacyId: conditionalEmailId },
    });

    let condId: string;
    if (existingCond) {
        await tx.v2FormCondition.update({
            where: { id: existingCond.id },
            data: {
                name: `conditional-email:${data.name}`,
            },
        });
        condId = existingCond.id;

        const existingRules =
            await tx.v2FormConditionRule.findMany({
                where: { conditionId: condId },
                orderBy: { sortOrder: "asc" },
            });
        const ruleData = {
            fieldId,
            operator: data.conditionOperator,
            value: data.conditionValue,
            connector: "AND",
            sortOrder: 0,
        };
        if (existingRules[0]) {
            await tx.v2FormConditionRule.update({
                where: { id: existingRules[0].id },
                data: ruleData,
            });
        } else {
            await tx.v2FormConditionRule.create({
                data: { ...ruleData, conditionId: condId },
            });
        }
    } else {
        const created = await tx.v2FormCondition.create({
            data: {
                legacyId: conditionalEmailId,
                formId,
                yearId,
                name: `conditional-email:${data.name}`,
                sortOrder: 0,
            },
        });
        condId = created.id;

        await tx.v2FormConditionRule.create({
            data: {
                conditionId: condId,
                fieldId,
                operator: data.conditionOperator,
                value: data.conditionValue,
                connector: "AND",
                sortOrder: 0,
            },
        });
    }

    // Find existing template by its condition (stable link)
    const existingTemplate = existingCond
        ? await tx.v2EmailTemplate.findFirst({
              where: { conditionId: condId },
              select: { id: true },
          })
        : null;

    const templateData = {
        name: data.name,
        enabled: data.enabled ?? false,
        subject: data.subject ?? null,
        body: data.body ?? null,
        bcc: data.bcc ?? null,
        accountId: data.accountId ?? null,
        attachments:
            (data.attachments as unknown[]) ?? [],
        sortOrder: data.sortOrder ?? 0,
        conditionId: condId,
    };

    let templateId: string;
    if (existingTemplate) {
        await tx.v2EmailTemplate.update({
            where: { id: existingTemplate.id },
            data: templateData,
        });
        templateId = existingTemplate.id;
    } else {
        const created = await tx.v2EmailTemplate.create({
            data: {
                ...templateData,
                yearId,
                type: "conditional",
            },
        });
        templateId = created.id;
    }

    if (data.sections !== undefined) {
        const existingSections =
            await tx.v2EmailSection.findMany({
                where: { templateId },
                orderBy: { sortOrder: "asc" },
            });
        await syncEmailSections(
            tx,
            templateId,
            yearId,
            data.sections,
            existingSections,
        );
    }
}

export async function toggleConditionalEmailInV2(
    tx: TxClient,
    conditionalEmailId: string,
    _yearId: string,
    formId: string,
    enabled: boolean,
): Promise<void> {
    const cond = await tx.v2FormCondition.findFirst({
        where: { formId, legacyId: conditionalEmailId },
        select: { id: true },
    });
    if (!cond) return;
    await tx.v2EmailTemplate.updateMany({
        where: { conditionId: cond.id },
        data: { enabled },
    });
}

export async function deleteConditionalEmailFromV2(
    tx: TxClient,
    conditionalEmailId: string,
    _yearId: string,
    formId: string,
): Promise<void> {
    const cond = await tx.v2FormCondition.findFirst({
        where: { formId, legacyId: conditionalEmailId },
        select: { id: true },
    });
    if (!cond) return;

    const template = await tx.v2EmailTemplate.findFirst({
        where: { conditionId: cond.id },
        select: { id: true },
    });

    if (template) {
        await tx.v2EmailSection.deleteMany({
            where: { templateId: template.id },
        });
        await tx.v2EmailTemplate.delete({
            where: { id: template.id },
        });
    }

    await tx.v2FormConditionRule.deleteMany({
        where: { conditionId: cond.id },
    });
    await tx.v2FormCondition.delete({
        where: { id: cond.id },
    });
}

// ============================================================
// Order creation (registration submission)
// ============================================================

export async function createV2Order(
    tx: TxClient,
    params: {
        yearId: string;
        formId: string;
        legacySubmissionId: string;
        submissionData: Record<string, unknown>;
        additionalPeople: AdditionalPersonData[];
        status: string;
        variableSymbol: string;
        totalPrice: number | null;
        publicUserId: string | null;
        isTest: boolean;
        gdprConsentAt: Date | null;
        allInputFields: InputField[];
        visibleFieldIds: Set<string>;
        apVisibleFieldIdsPerPerson: Set<string>[];
    },
): Promise<string | null> {
    // Build field name → v2 field ID map
    const v2Fields = await tx.v2FormField.findMany({
        where: { formId: params.formId, isActive: true },
    });
    if (v2Fields.length === 0) return null;

    const fieldNameToV2: Map<
        string,
        { id: string; legacyId: string | null }
    > = new Map();
    for (const f of v2Fields) {
        fieldNameToV2.set(f.name, {
            id: f.id,
            legacyId: f.legacyId,
        });
    }

    // Build legacy option ID → v2 option ID map
    const v2Options = await tx.v2PricingOption.findMany({
        where: {
            definition: { formId: params.formId },
            isActive: true,
        },
        include: {
            definition: { select: { legacyId: true } },
        },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const optionLegacyToV2 = new Map<string, any>(
        v2Options
            .filter(
                (o: { legacyId: string | null }) => o.legacyId,
            )
            .map(
                (o: { legacyId: string; id: string }) => [
                    o.legacyId,
                    o,
                ] as [string, unknown],
            ),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const optionNameToV2 = new Map<string, any>(
        v2Options.map(
            (o: { name: string; id: string }) => [
                o.name,
                o,
            ] as [string, unknown],
        ),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const optionV2IdToV2Create = new Map<string, any>(
        v2Options.map(
            (o: { id: string }) => [
                o.id,
                o,
            ] as [string, unknown],
        ),
    );

    // Find current price tier
    const currentTierPrice = await getCurrentTierPriceMap(
        tx,
        params.formId,
    );

    // Create the order
    const order = await tx.v2Order.create({
        data: {
            yearId: params.yearId,
            formId: params.formId,
            publicUserId: params.publicUserId,
            status: params.status,
            variableSymbol: params.variableSymbol,
            totalPrice: params.totalPrice,
            isTest: params.isTest,
            gdprConsentAt: params.gdprConsentAt,
            legacySubmissionId: params.legacySubmissionId,
        },
    });

    // Create people + line items
    const allPeople = [
        params.submissionData,
        ...params.additionalPeople,
    ];

    for (let pi = 0; pi < allPeople.length; pi++) {
        const personData =
            pi === 0
                ? params.submissionData
                : params.additionalPeople[pi - 1];
        const visibleIds =
            pi === 0
                ? params.visibleFieldIds
                : (params.apVisibleFieldIdsPerPerson[
                      pi - 1
                  ] ?? params.visibleFieldIds);

        const person = await tx.v2OrderPerson.create({
            data: {
                orderId: order.id,
                personIndex: pi,
            },
        });

        await createLineItemsForPerson(
            tx,
            person.id,
            order.id,
            params.yearId,
            personData,
            visibleIds,
            params.allInputFields,
            fieldNameToV2,
            optionLegacyToV2,
            optionNameToV2,
            optionV2IdToV2Create,
            currentTierPrice,
            pi > 0,
        );
    }

    return order.id;
}

async function getCurrentTierPriceMap(
    tx: TxClient,
    formId: string,
): Promise<Map<string, number>> {
    const tiers = await tx.v2PriceTier.findMany({
        where: { formId },
        orderBy: { sortOrder: "asc" },
    });

    const now = new Date();
    let currentTierId: string | null = null;
    for (const tier of tiers) {
        if (tier.deadline && now <= tier.deadline) {
            currentTierId = tier.id;
            break;
        }
    }
    // Fallback tier (deadline = null)
    if (!currentTierId) {
        const fallback = tiers.find(
            (t: { deadline: Date | null }) => !t.deadline,
        );
        currentTierId = fallback?.id ?? null;
    }

    if (!currentTierId) return new Map();

    const prices = await tx.v2PricingOptionPrice.findMany({
        where: { tierId: currentTierId },
    });

    return new Map(
        prices.map(
            (p: { optionId: string; price: number }) => [
                p.optionId,
                p.price,
            ],
        ),
    );
}

async function createLineItemsForPerson(
    tx: TxClient,
    personId: string,
    orderId: string,
    yearId: string,
    personData: Record<string, unknown>,
    visibleFieldIds: Set<string>,
    allInputFields: InputField[],
    fieldNameToV2: Map<
        string,
        { id: string; legacyId: string | null }
    >,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    optionLegacyToV2: Map<string, any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    optionNameToV2: Map<string, any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    optionV2IdToV2: Map<string, any>,
    currentTierPrice: Map<string, number>,
    isAdditionalPerson: boolean,
): Promise<void> {
    for (const field of allInputFields) {
        if (!visibleFieldIds.has(field.id)) continue;
        if (
            isAdditionalPerson &&
            !field.includeForAdditionalPeople
        )
            continue;

        const v2Field = fieldNameToV2.get(field.name);
        if (!v2Field) continue;

        const rawValue = personData[field.name];
        if (rawValue === undefined || rawValue === null)
            continue;

        const lineItems = resolveLineItems(
            field,
            rawValue,
            optionLegacyToV2,
            optionNameToV2,
            optionV2IdToV2,
            currentTierPrice,
        );

        for (const li of lineItems) {
            await tx.v2OrderLineItem.create({
                data: {
                    personId,
                    orderId,
                    yearId,
                    fieldId: v2Field.id,
                    pricingOptionId: li.pricingOptionId,
                    value: li.value,
                    quantity: li.quantity,
                    unitPriceAtSubmission:
                        li.unitPriceAtSubmission,
                },
            });
        }
    }
}

interface LineItemData {
    pricingOptionId: string | null;
    value: string | null;
    quantity: number;
    unitPriceAtSubmission: number;
}

function resolveLineItems(
    field: InputField,
    rawValue: unknown,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    optionLegacyToV2: Map<string, any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    optionNameToV2: Map<string, any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    optionV2IdToV2: Map<string, any>,
    currentTierPrice: Map<string, number>,
): LineItemData[] {
    if (field.type === "pricing_select") {
        const optionId = String(rawValue);
        const v2Opt =
            optionV2IdToV2.get(optionId) ??
            optionLegacyToV2.get(optionId) ??
            optionNameToV2.get(optionId);
        if (v2Opt) {
            return [{
                pricingOptionId: v2Opt.id,
                value: v2Opt.name,
                quantity: 1,
                unitPriceAtSubmission:
                    currentTierPrice.get(v2Opt.id) ?? 0,
            }];
        }
        return [{
            pricingOptionId: null,
            value: optionId,
            quantity: 1,
            unitPriceAtSubmission: 0,
        }];
    }

    if (field.type === "pricing_multi_select") {
        const selected = parseSelected(rawValue);
        const items: LineItemData[] = [];
        for (const optId of selected) {
            const v2Opt =
                optionV2IdToV2.get(optId) ??
                optionLegacyToV2.get(optId) ??
                optionNameToV2.get(optId);
            if (v2Opt) {
                items.push({
                    pricingOptionId: v2Opt.id,
                    value: v2Opt.name,
                    quantity: 1,
                    unitPriceAtSubmission:
                        currentTierPrice.get(v2Opt.id) ?? 0,
                });
            }
        }
        return items.length > 0
            ? items
            : [{
                  pricingOptionId: null,
                  value: String(rawValue),
                  quantity: 1,
                  unitPriceAtSubmission: 0,
              }];
    }

    if (field.type === "pricing_quantity") {
        const quantities = parseQuantities(rawValue);
        const items: LineItemData[] = [];
        for (const [optId, qty] of Object.entries(quantities)) {
            if (qty <= 0) continue;
            const v2Opt =
                optionV2IdToV2.get(optId) ??
                optionLegacyToV2.get(optId) ??
                optionNameToV2.get(optId);
            if (v2Opt) {
                items.push({
                    pricingOptionId: v2Opt.id,
                    value: v2Opt.name,
                    quantity: qty,
                    unitPriceAtSubmission:
                        currentTierPrice.get(v2Opt.id) ?? 0,
                });
            }
        }
        return items.length > 0
            ? items
            : [{
                  pricingOptionId: null,
                  value: String(rawValue),
                  quantity: 1,
                  unitPriceAtSubmission: 0,
              }];
    }

    // Non-priced field
    return [{
        pricingOptionId: null,
        value: String(rawValue),
        quantity: 1,
        unitPriceAtSubmission: 0,
    }];
}

// ============================================================
// Order scalar sync (status, payment, admin note, etc.)
// ============================================================

export async function syncOrderScalarToV2(
    tx: TxClient,
    legacySubmissionId: string,
    data: {
        status?: string;
        isPaid?: boolean;
        paidAt?: Date | null;
        adminNote?: string | null;
        emailSent?: boolean;
        emailSentAt?: Date | null;
        totalPrice?: number | null;
    },
): Promise<void> {
    await tx.v2Order.updateMany({
        where: { legacySubmissionId },
        data,
    });
}

// ============================================================
// Order line items sync (admin/public edit of submission data)
// ============================================================

export async function syncOrderLineItemsToV2(
    tx: TxClient,
    legacySubmissionId: string,
    newData: Record<string, unknown>,
    formId: string,
): Promise<void> {
    const order = await tx.v2Order.findFirst({
        where: { legacySubmissionId },
        select: {
            id: true,
            yearId: true,
            people: {
                orderBy: { personIndex: "asc" },
                select: { id: true, personIndex: true },
            },
        },
    });
    if (!order) return;

    const v2Fields = await tx.v2FormField.findMany({
        where: { formId, isActive: true },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fieldNameToV2 = new Map<string, any>(
        v2Fields.map(
            (f: { name: string; id: string }) => [
                f.name,
                f,
            ] as [string, unknown],
        ),
    );

    const v2Options = await tx.v2PricingOption.findMany({
        where: {
            definition: { formId },
            isActive: true,
        },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const optionLegacyToV2 = new Map<string, any>(
        v2Options
            .filter(
                (o: { legacyId: string | null }) => o.legacyId,
            )
            .map(
                (o: { legacyId: string; id: string }) => [
                    o.legacyId,
                    o,
                ] as [string, unknown],
            ),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const optionNameToV2 = new Map<string, any>(
        v2Options.map(
            (o: { name: string; id: string }) => [
                o.name,
                o,
            ] as [string, unknown],
        ),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const optionV2IdToV2 = new Map<string, any>(
        v2Options.map(
            (o: { id: string }) => [
                o.id,
                o,
            ] as [string, unknown],
        ),
    );

    const currentTierPrice = await getCurrentTierPriceMap(
        tx,
        formId,
    );

    // Fetch all input fields for the form
    const form = await tx.registrationForm.findUnique({
        where: { id: formId },
        select: { fields: true },
    });
    if (!form) return;
    const formData = migrateFormData(form.fields);
    const allInputFields = getAllInputFields(
        formData.fields,
    );

    async function syncFieldLineItems(
        personId: string,
        fieldId: string,
        items: LineItemData[],
    ): Promise<void> {
        const hasPricingItems = items.some(
            (li) => li.pricingOptionId,
        );

        if (!hasPricingItems) {
            await tx.v2OrderLineItem.deleteMany({
                where: { personId, fieldId },
            });
            for (const li of items) {
                await tx.v2OrderLineItem.create({
                    data: {
                        personId,
                        orderId: order.id,
                        yearId: order.yearId,
                        fieldId,
                        ...li,
                    },
                });
            }
            return;
        }

        const existing =
            await tx.v2OrderLineItem.findMany({
                where: { personId, fieldId },
                select: {
                    id: true,
                    pricingOptionId: true,
                },
            });

        const existingByOpt = new Map<
            string,
            string
        >(
            existing
                .filter(
                    (e: {
                        pricingOptionId:
                            | string
                            | null;
                    }) => e.pricingOptionId,
                )
                .map(
                    (e: {
                        id: string;
                        pricingOptionId:
                            | string
                            | null;
                    }) => [
                        e.pricingOptionId!,
                        e.id,
                    ],
                ),
        );
        const matched = new Set<string>();

        for (const li of items) {
            const key = li.pricingOptionId;
            const existingId = key
                ? existingByOpt.get(key)
                : undefined;
            if (existingId) {
                matched.add(existingId);
                await tx.v2OrderLineItem.update({
                    where: { id: existingId },
                    data: {
                        value: li.value,
                        quantity: li.quantity,
                    },
                });
            } else {
                await tx.v2OrderLineItem.create({
                    data: {
                        personId,
                        orderId: order.id,
                        yearId: order.yearId,
                        fieldId,
                        ...li,
                    },
                });
            }
        }

        const toDelete = existing.filter(
            (e: { id: string }) =>
                !matched.has(e.id),
        );
        if (toDelete.length > 0) {
            await tx.v2OrderLineItem.deleteMany({
                where: {
                    id: {
                        in: toDelete.map(
                            (e: { id: string }) =>
                                e.id,
                        ),
                    },
                },
            });
        }
    }

    // Main person (personIndex 0)
    const mainPerson = order.people.find(
        (p: { personIndex: number }) => p.personIndex === 0,
    );
    if (mainPerson) {
        for (const field of allInputFields) {
            const v2Field = fieldNameToV2.get(field.name);
            if (!v2Field) continue;

            const rawValue = newData[field.name];
            if (rawValue === undefined) {
                await tx.v2OrderLineItem.deleteMany({
                    where: {
                        personId: mainPerson.id,
                        fieldId: v2Field.id,
                    },
                });
                continue;
            }

            const items = resolveLineItems(
                field,
                rawValue,
                optionLegacyToV2,
                optionNameToV2,
                optionV2IdToV2,
                currentTierPrice,
            );
            await syncFieldLineItems(
                mainPerson.id,
                v2Field.id,
                items,
            );
        }
    }

    // Additional people — delete orphaned rows first
    const ap = newData.additionalPeople;
    const apCount = Array.isArray(ap) ? ap.length : 0;
    await tx.v2OrderLineItem.deleteMany({
        where: {
            orderId: order.id,
            person: { personIndex: { gt: apCount } },
        },
    });
    await tx.v2OrderPerson.deleteMany({
        where: {
            orderId: order.id,
            personIndex: { gt: apCount },
        },
    });

    if (Array.isArray(ap)) {
        for (let pi = 0; pi < ap.length; pi++) {
            const apPerson = order.people.find(
                (p: { personIndex: number }) =>
                    p.personIndex === pi + 1,
            );
            if (!apPerson) continue;

            const personData = ap[pi] as Record<
                string,
                unknown
            >;
            for (const field of allInputFields) {
                if (!field.includeForAdditionalPeople)
                    continue;
                const v2Field = fieldNameToV2.get(
                    field.name,
                );
                if (!v2Field) continue;

                const rawValue = personData[field.name];
                if (rawValue === undefined) {
                    await tx.v2OrderLineItem.deleteMany({
                        where: {
                            personId: apPerson.id,
                            fieldId: v2Field.id,
                        },
                    });
                    continue;
                }

                const items = resolveLineItems(
                    field,
                    rawValue,
                    optionLegacyToV2,
                    optionNameToV2,
                    optionV2IdToV2,
                    currentTierPrice,
                );
                await syncFieldLineItems(
                    apPerson.id,
                    v2Field.id,
                    items,
                );
            }
        }
    }
}
