import type { Prisma } from "@prisma/client";

// ============================================================
// Pure date helpers
// ============================================================

/**
 * Milliseconds between the source year's anchor date and the new year's
 * anchor date. Positive when the new year is later than the source year.
 */
export function computeDeltaMs(anchorStart: Date, newStart: Date): number {
    return newStart.getTime() - anchorStart.getTime();
}

/** Shifts a date by a fixed millisecond offset (keeps time-of-day intact). */
export function shiftDate(date: Date, deltaMs: number): Date {
    return new Date(date.getTime() + deltaMs);
}

// ============================================================
// Selection input
// ============================================================

export interface YearCopySelection {
    sectionIds: string[];
    homepageStepIds: string[];
    newsIds: string[];
    programDayIds: string[];
    v2EmailTemplateIds: string[];
    copyRegistrationForm: boolean;
    copyLimits: boolean; // ignored unless copyRegistrationForm is true
    copySuccessContent: boolean; // Year scalar — ignored by this engine, caller handles it
}

// ============================================================
// Result
// ============================================================

export interface YearCopyResult {
    pagesCopied: number;
    sectionTypesCopied: number;
    sectionsCopied: number;
    homepageStepsCopied: number;
    newsCopied: number;
    programDaysCopied: number;
    programEventsCopied: number;
    registrationFormCopied: boolean;
    priceTiersCopied: number;
    pricingDefinitionsCopied: number;
    pricingOptionsCopied: number;
    pricingOptionPricesCopied: number;
    formFieldsCopied: number;
    formConditionsCopied: number;
    formConditionRulesCopied: number;
    capacityLimitsCopied: number;
    v2EmailTemplatesCopied: number;
    v2EmailSectionsCopied: number;
    skippedConditionalTemplateIds: string[];
    skippedConditionalSectionIds: string[];
}

function emptyResult(): YearCopyResult {
    return {
        pagesCopied: 0,
        sectionTypesCopied: 0,
        sectionsCopied: 0,
        homepageStepsCopied: 0,
        newsCopied: 0,
        programDaysCopied: 0,
        programEventsCopied: 0,
        registrationFormCopied: false,
        priceTiersCopied: 0,
        pricingDefinitionsCopied: 0,
        pricingOptionsCopied: 0,
        pricingOptionPricesCopied: 0,
        formFieldsCopied: 0,
        formConditionsCopied: 0,
        formConditionRulesCopied: 0,
        capacityLimitsCopied: 0,
        v2EmailTemplatesCopied: 0,
        v2EmailSectionsCopied: 0,
        skippedConditionalTemplateIds: [],
        skippedConditionalSectionIds: [],
    };
}

// ============================================================
// Main copy engine
// ============================================================

export interface CopyYearContentParams {
    sourceYearId: string;
    newYearId: string;
    selection: YearCopySelection;
    deltaMs: number;
}

/**
 * Copies selected content from one year to another. Pure data-copy engine:
 * every write goes through the passed-in transaction client, never the
 * module-level `db`. The caller (a server action) is responsible for
 * wrapping this in `db.$transaction` and for copying Year scalar fields
 * (registrationSuccessContent, headerPhoto, heroPhoto,
 * registrationStartDate) — `selection.copySuccessContent` is read by the
 * caller only, the engine itself ignores it.
 */
export async function copyYearContent(
    tx: Prisma.TransactionClient,
    params: CopyYearContentParams
): Promise<YearCopyResult> {
    const { sourceYearId, newYearId, selection, deltaMs } = params;
    const result = emptyResult();

    await copySections(
        tx,
        sourceYearId,
        newYearId,
        selection.sectionIds,
        result
    );
    await copyHomepageSteps(
        tx,
        sourceYearId,
        newYearId,
        selection.homepageStepIds,
        result
    );
    await copyNews(tx, sourceYearId, newYearId, selection.newsIds, result);
    await copyProgramDays(
        tx,
        sourceYearId,
        newYearId,
        selection.programDayIds,
        deltaMs,
        result
    );

    let condMap: Map<string, string> = new Map();
    if (selection.copyRegistrationForm) {
        condMap = await copyRegistrationForm(
            tx,
            sourceYearId,
            newYearId,
            selection.copyLimits,
            deltaMs,
            result
        );
    }

    await copyV2EmailTemplates(
        tx,
        sourceYearId,
        newYearId,
        selection.v2EmailTemplateIds,
        selection.copyRegistrationForm,
        condMap,
        result
    );

    return result;
}

// ============================================================
// Independent per-item copies
// ============================================================

async function copySections(
    tx: Prisma.TransactionClient,
    sourceYearId: string,
    newYearId: string,
    sectionIds: string[],
    result: YearCopyResult
): Promise<void> {
    if (sectionIds.length === 0) return;

    const sections = await tx.section.findMany({
        where: {
            id: { in: sectionIds },
            sectionType: { yearId: sourceYearId },
        },
        include: { sectionType: true },
        orderBy: { sortOrder: "asc" },
    });

    // Maps a source SectionType id to its freshly created counterpart under
    // the new year, so each parent type is copied exactly once regardless of
    // how many of its blocks are selected.
    const typeMap = new Map<string, string>();

    for (const section of sections) {
        let newTypeId = typeMap.get(section.sectionTypeId);
        if (!newTypeId) {
            const sourceType = section.sectionType;
            const newType = await tx.sectionType.create({
                data: {
                    yearId: newYearId,
                    label: sourceType.label,
                    slug: sourceType.slug,
                    icon: sourceType.icon,
                    sortOrder: sourceType.sortOrder,
                    pageTitle: sourceType.pageTitle,
                    pageSubtitle: sourceType.pageSubtitle,
                    metaTitle: sourceType.metaTitle,
                    metaDescription: sourceType.metaDescription,
                    featuredOnIndex: sourceType.featuredOnIndex,
                    description: sourceType.description,
                },
            });
            newTypeId = newType.id;
            typeMap.set(section.sectionTypeId, newTypeId);
            result.sectionTypesCopied += 1;
        }

        await tx.section.create({
            data: {
                sectionTypeId: newTypeId,
                title: section.title,
                subtitle: section.subtitle,
                description: section.description,
                icon: section.icon,
                content: section.content as Prisma.InputJsonValue,
                showToc: section.showToc,
                sortOrder: section.sortOrder,
            },
        });
        result.sectionsCopied += 1;
    }
}

async function copyHomepageSteps(
    tx: Prisma.TransactionClient,
    sourceYearId: string,
    newYearId: string,
    homepageStepIds: string[],
    result: YearCopyResult
): Promise<void> {
    if (homepageStepIds.length === 0) return;

    const steps = await tx.homepageStep.findMany({
        where: { id: { in: homepageStepIds }, yearId: sourceYearId },
    });

    for (const step of steps) {
        await tx.homepageStep.create({
            data: {
                yearId: newYearId,
                title: step.title,
                description: step.description,
                icon: step.icon,
                sortOrder: step.sortOrder,
            },
        });
        result.homepageStepsCopied += 1;
    }
}

async function copyNews(
    tx: Prisma.TransactionClient,
    sourceYearId: string,
    newYearId: string,
    newsIds: string[],
    result: YearCopyResult
): Promise<void> {
    if (newsIds.length === 0) return;

    const newsItems = await tx.news.findMany({
        where: { id: { in: newsIds }, yearId: sourceYearId },
    });

    for (const item of newsItems) {
        await tx.news.create({
            data: {
                yearId: newYearId,
                authorId: item.authorId,
                slug: item.slug,
                title: item.title,
                excerpt: item.excerpt,
                content: item.content,
                coverImage: item.coverImage,
                showToc: item.showToc,
                actionButtons: item.actionButtons as Prisma.InputJsonValue,
                isPublished: item.isPublished,
                publishedAt: item.publishedAt,
            },
        });
        result.newsCopied += 1;
    }
}

async function copyProgramDays(
    tx: Prisma.TransactionClient,
    sourceYearId: string,
    newYearId: string,
    programDayIds: string[],
    deltaMs: number,
    result: YearCopyResult
): Promise<void> {
    if (programDayIds.length === 0) return;

    const days = await tx.programDay.findMany({
        where: { id: { in: programDayIds }, yearId: sourceYearId },
        include: { events: true },
    });

    for (const day of days) {
        const newDay = await tx.programDay.create({
            data: {
                yearId: newYearId,
                date: shiftDate(day.date, deltaMs),
                label: day.label,
                sortOrder: day.sortOrder,
            },
        });
        result.programDaysCopied += 1;

        for (const event of day.events) {
            await tx.programEvent.create({
                data: {
                    dayId: newDay.id,
                    startTime: event.startTime,
                    endTime: event.endTime,
                    title: event.title,
                    description: event.description,
                    location: event.location,
                    imageUrl: event.imageUrl,
                    tags: event.tags,
                    storyContent:
                        event.storyContent === null
                            ? undefined
                            : (event.storyContent as Prisma.InputJsonValue),
                    actionButtons: event.actionButtons as Prisma.InputJsonValue,
                    isPublished: event.isPublished,
                    sortOrder: event.sortOrder,
                },
            });
            result.programEventsCopied += 1;
        }
    }
}

// ============================================================
// Registration form unit (FK-safe order)
// ============================================================

async function copyRegistrationForm(
    tx: Prisma.TransactionClient,
    sourceYearId: string,
    newYearId: string,
    copyLimits: boolean,
    deltaMs: number,
    result: YearCopyResult
): Promise<Map<string, string>> {
    const condMap = new Map<string, string>();

    const sourceForm = await tx.registrationForm.findUnique({
        where: { yearId: sourceYearId },
    });
    if (!sourceForm) return condMap;

    const newForm = await tx.registrationForm.create({
        data: {
            yearId: newYearId,
            fields: sourceForm.fields as Prisma.InputJsonValue,
        },
    });
    result.registrationFormCopied = true;

    // a. V2PriceTier
    const tierMap = new Map<string, string>();
    const tiers = await tx.v2PriceTier.findMany({
        where: { formId: sourceForm.id },
    });
    for (const tier of tiers) {
        const newTier = await tx.v2PriceTier.create({
            data: {
                formId: newForm.id,
                yearId: newYearId,
                deadline: tier.deadline
                    ? shiftDate(tier.deadline, deltaMs)
                    : null,
                sortOrder: tier.sortOrder,
            },
        });
        tierMap.set(tier.id, newTier.id);
        result.priceTiersCopied += 1;
    }

    // b. V2PricingDefinition
    const defMap = new Map<string, string>();
    const definitions = await tx.v2PricingDefinition.findMany({
        where: { formId: sourceForm.id },
    });
    for (const definition of definitions) {
        const newDefinition = await tx.v2PricingDefinition.create({
            data: {
                formId: newForm.id,
                yearId: newYearId,
                legacyId: null,
                name: definition.name,
                type: definition.type,
                multiSelect: definition.multiSelect,
                unitName: definition.unitName,
                usePriceTiers: definition.usePriceTiers,
                isActive: definition.isActive,
                sortOrder: definition.sortOrder,
            },
        });
        defMap.set(definition.id, newDefinition.id);
        result.pricingDefinitionsCopied += 1;
    }

    // c. V2PricingOption
    const optMap = new Map<string, string>();
    const options = await tx.v2PricingOption.findMany({
        where: { definitionId: { in: [...defMap.keys()] } },
    });
    for (const option of options) {
        const newDefinitionId = defMap.get(option.definitionId);
        if (!newDefinitionId) continue;
        const newOption = await tx.v2PricingOption.create({
            data: {
                definitionId: newDefinitionId,
                legacyId: null,
                name: option.name,
                description: option.description,
                isActive: option.isActive,
                sortOrder: option.sortOrder,
            },
        });
        optMap.set(option.id, newOption.id);
        result.pricingOptionsCopied += 1;
    }

    // d. V2PricingOptionPrice
    const optionPrices = await tx.v2PricingOptionPrice.findMany({
        where: { optionId: { in: [...optMap.keys()] } },
    });
    for (const optionPrice of optionPrices) {
        const newOptionId = optMap.get(optionPrice.optionId);
        const newTierId = tierMap.get(optionPrice.tierId);
        if (!newOptionId || !newTierId) continue;
        await tx.v2PricingOptionPrice.create({
            data: {
                optionId: newOptionId,
                tierId: newTierId,
                price: optionPrice.price,
            },
        });
        result.pricingOptionPricesCopied += 1;
    }

    // e. V2FormField
    const fieldMap = new Map<string, string>();
    const fields = await tx.v2FormField.findMany({
        where: { formId: sourceForm.id },
    });
    for (const field of fields) {
        const newPricingDefinitionId = field.pricingDefinitionId
            ? (defMap.get(field.pricingDefinitionId) ?? null)
            : null;
        const newField = await tx.v2FormField.create({
            data: {
                formId: newForm.id,
                yearId: newYearId,
                legacyId: null,
                name: field.name,
                label: field.label,
                type: field.type,
                required: field.required,
                editable: field.editable,
                pricingDefinitionId: newPricingDefinitionId,
                includeForAdditionalPeople: field.includeForAdditionalPeople,
                options: field.options,
                isActive: field.isActive,
                sortOrder: field.sortOrder,
            },
        });
        fieldMap.set(field.id, newField.id);
        result.formFieldsCopied += 1;
    }

    // f. V2FormCondition
    const conditions = await tx.v2FormCondition.findMany({
        where: { formId: sourceForm.id },
    });
    for (const condition of conditions) {
        const newCondition = await tx.v2FormCondition.create({
            data: {
                formId: newForm.id,
                yearId: newYearId,
                legacyId: null,
                name: condition.name,
                sortOrder: condition.sortOrder,
            },
        });
        condMap.set(condition.id, newCondition.id);
        result.formConditionsCopied += 1;
    }

    // g. V2FormConditionRule
    const rules = await tx.v2FormConditionRule.findMany({
        where: { conditionId: { in: [...condMap.keys()] } },
    });
    for (const rule of rules) {
        const newConditionId = condMap.get(rule.conditionId);
        if (!newConditionId) continue;
        const newFieldId = rule.fieldId
            ? (fieldMap.get(rule.fieldId) ?? null)
            : null;
        await tx.v2FormConditionRule.create({
            data: {
                conditionId: newConditionId,
                fieldId: newFieldId,
                operator: rule.operator,
                value: rule.value,
                connector: rule.connector,
                sortOrder: rule.sortOrder,
            },
        });
        result.formConditionRulesCopied += 1;
    }

    // h. V2CapacityLimit (only when copyLimits)
    if (copyLimits) {
        const limits = await tx.v2CapacityLimit.findMany({
            where: { formId: sourceForm.id },
        });
        for (const limit of limits) {
            const newFieldId = fieldMap.get(limit.fieldId);
            if (!newFieldId) continue;
            await tx.v2CapacityLimit.create({
                data: {
                    formId: newForm.id,
                    yearId: newYearId,
                    legacyId: null,
                    fieldId: newFieldId,
                    optionValue: limit.optionValue,
                    maxCount: limit.maxCount,
                },
            });
            result.capacityLimitsCopied += 1;
        }
    }

    return condMap;
}

// ============================================================
// V2 email templates
// ============================================================

async function copyV2EmailTemplates(
    tx: Prisma.TransactionClient,
    sourceYearId: string,
    newYearId: string,
    v2EmailTemplateIds: string[],
    copyRegistrationForm: boolean,
    condMap: Map<string, string>,
    result: YearCopyResult
): Promise<void> {
    if (v2EmailTemplateIds.length === 0) return;

    const templates = await tx.v2EmailTemplate.findMany({
        where: { id: { in: v2EmailTemplateIds }, yearId: sourceYearId },
        include: { sections: true },
    });

    for (const template of templates) {
        let newConditionId: string | null = null;
        if (template.conditionId !== null) {
            if (!copyRegistrationForm) {
                result.skippedConditionalTemplateIds.push(template.id);
                continue;
            }
            const mapped = condMap.get(template.conditionId);
            if (!mapped) {
                // Condition wasn't copied (shouldn't happen when
                // copyRegistrationForm is true) — skip defensively.
                result.skippedConditionalTemplateIds.push(template.id);
                continue;
            }
            newConditionId = mapped;
        }

        const newTemplate = await tx.v2EmailTemplate.create({
            data: {
                yearId: newYearId,
                type: template.type,
                conditionId: newConditionId,
                name: template.name,
                enabled: template.enabled,
                subject: template.subject,
                body: template.body,
                bcc: template.bcc,
                accountId: template.accountId,
                attachments: template.attachments as Prisma.InputJsonValue,
                sortOrder: template.sortOrder,
            },
        });
        result.v2EmailTemplatesCopied += 1;

        for (const section of template.sections) {
            let newSectionConditionId: string | null = null;
            if (section.conditionId !== null) {
                const mappedSectionCondition = condMap.get(section.conditionId);
                if (mappedSectionCondition) {
                    newSectionConditionId = mappedSectionCondition;
                } else {
                    // Condition not copied (form not copied) — section is
                    // still copied with conditionId null, but tracked.
                    result.skippedConditionalSectionIds.push(section.id);
                }
            }
            await tx.v2EmailSection.create({
                data: {
                    templateId: newTemplate.id,
                    conditionId: newSectionConditionId,
                    body: section.body,
                    attachments: section.attachments as Prisma.InputJsonValue,
                    sortOrder: section.sortOrder,
                },
            });
            result.v2EmailSectionsCopied += 1;
        }
    }
}
