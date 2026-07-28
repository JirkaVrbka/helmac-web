import type { OrderDetailPerson, V2PricingDef } from "@/lib/services/v2";
import type {
    FieldMeta,
    PersonState,
    FormSection,
    SerializedOrder,
} from "./types";

export function buildPersonState(
    person: OrderDetailPerson,
): PersonState {
    const values: Record<string, string> = {};
    const quantities: Record<
        string,
        Record<string, number>
    > = {};
    const multiSelects: Record<string, string[]> = {};

    for (const li of person.lineItems) {
        const name = li.fieldName;
        if (
            li.fieldType === "pricing_quantity" &&
            li.pricingOptionId
        ) {
            if (!quantities[name]) quantities[name] = {};
            quantities[name][li.pricingOptionId] =
                li.quantity;
        } else if (
            li.fieldType === "pricing_multi_select" &&
            li.pricingOptionId
        ) {
            if (!multiSelects[name])
                multiSelects[name] = [];
            multiSelects[name].push(li.pricingOptionId);
        } else if (
            li.fieldType === "pricing_select" &&
            li.pricingOptionId
        ) {
            values[name] = li.pricingOptionId;
        } else {
            values[name] = li.value ?? "";
        }
    }

    return {
        personIndex: person.personIndex,
        values,
        quantities,
        multiSelects,
    };
}

export function buildFields(
    order: SerializedOrder,
): FieldMeta[] {
    const byName = new Map(
        order.allFields.map((f) => [
            f.name,
            {
                ...f,
                includeForAP:
                    f.includeForAdditionalPeople,
            },
        ]),
    );
    for (const person of order.people) {
        for (const li of person.lineItems) {
            if (byName.has(li.fieldName)) continue;
            byName.set(li.fieldName, {
                id: li.fieldId,
                name: li.fieldName,
                label: li.fieldLabel,
                type: li.fieldType,
                isActive: li.fieldIsActive,
                sortOrder: li.fieldSortOrder,
                options: li.fieldOptions,
                pricingDefinitionId:
                    li.fieldPricingDefinitionId,
                includeForAP: li.fieldIncludeForAP,
                includeForAdditionalPeople:
                    li.fieldIncludeForAP,
            });
        }
    }
    return Array.from(byName.values()).sort(
        (a, b) => a.sortOrder - b.sortOrder,
    );
}

export function extractSections(
    layout: unknown,
    fieldNames: Set<string>,
): FormSection[] {
    const sections: FormSection[] = [];
    let current: FormSection = {
        heading: null,
        fieldNames: [],
    };

    function walk(elements: unknown[]) {
        for (const el of elements) {
            if (!el || typeof el !== "object") continue;
            const obj = el as Record<string, unknown>;
            if (obj.type === "heading") {
                if (current.fieldNames.length > 0) {
                    sections.push(current);
                }
                current = {
                    heading: String(obj.text ?? ""),
                    fieldNames: [],
                };
            } else if (
                obj.type === "condition" &&
                Array.isArray(obj.children)
            ) {
                walk(obj.children);
            } else if (
                obj.name &&
                typeof obj.name === "string" &&
                fieldNames.has(obj.name)
            ) {
                current.fieldNames.push(obj.name);
            }
        }
    }

    if (layout && typeof layout === "object") {
        const raw = layout as Record<string, unknown>;
        if (Array.isArray(raw.fields)) {
            walk(raw.fields);
        }
    }

    if (current.fieldNames.length > 0) {
        sections.push(current);
    }

    return sections;
}

export function personStateToLegacyData(
    state: PersonState,
    fields: FieldMeta[],
): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const field of fields) {
        switch (field.type) {
            case "checkbox":
                data[field.name] =
                    state.values[field.name] === "true";
                break;
            case "pricing_quantity":
                data[field.name] = JSON.stringify(
                    state.quantities[field.name] ?? {},
                );
                break;
            case "pricing_multi_select":
                data[field.name] = JSON.stringify(
                    state.multiSelects[field.name] ?? [],
                );
                break;
            default:
                data[field.name] =
                    state.values[field.name] ?? "";
                break;
        }
    }
    return data;
}

export function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString("cs-CZ", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// Assumes priceTiers are sorted by sortOrder (ascending deadlines,
// fallback tier last with deadline: null). This matches the DB query
// order in getFormStructure / getOrderByLegacyId.
export function getCurrentTierId(
    priceTiers: SerializedOrder["priceTiers"],
    asOf?: Date,
): string | null {
    if (priceTiers.length === 0) return null;
    const ref = asOf ?? new Date();
    for (const tier of priceTiers) {
        if (
            tier.deadline &&
            ref <= new Date(tier.deadline)
        ) {
            return tier.id;
        }
    }
    return priceTiers[priceTiers.length - 1].id;
}

export function computeTotal(
    personStates: PersonState[],
    fields: FieldMeta[],
    pricingDefById: Map<string, V2PricingDef>,
    currentTierId: string | null,
    perPersonVisibleFields?: Set<string>[],
    layoutFieldNames?: Set<string>,
): number {
    let total = 0;
    for (let pi = 0; pi < personStates.length; pi++) {
        const state = personStates[pi];
        const visibleFields = perPersonVisibleFields?.[pi];
        for (const field of fields) {
            if (!field.pricingDefinitionId) continue;
            const inLayout =
                !layoutFieldNames ||
                layoutFieldNames.has(field.name);
            if (
                inLayout &&
                visibleFields &&
                !visibleFields.has(field.name)
            )
                continue;
            const def = pricingDefById.get(
                field.pricingDefinitionId,
            );
            if (!def) continue;

            const optionPrice = (optId: string) => {
                const opt = def.options.find(
                    (o) => o.id === optId,
                );
                if (!opt || opt.prices.length === 0)
                    return 0;
                if (currentTierId) {
                    const tierPrice = opt.prices.find(
                        (p) => p.tierId === currentTierId,
                    );
                    if (tierPrice) return tierPrice.price;
                }
                return opt.prices[0]?.price ?? 0;
            };

            switch (field.type) {
                case "pricing_select": {
                    const val =
                        state.values[field.name] ?? "";
                    if (val) total += optionPrice(val);
                    break;
                }
                case "pricing_multi_select": {
                    const selected =
                        state.multiSelects[field.name] ??
                        [];
                    for (const optId of selected) {
                        total += optionPrice(optId);
                    }
                    break;
                }
                case "pricing_quantity": {
                    const qtys =
                        state.quantities[field.name] ??
                        {};
                    for (const [optId, qty] of Object.entries(
                        qtys,
                    )) {
                        total +=
                            optionPrice(optId) * qty;
                    }
                    break;
                }
            }
        }
    }
    return total;
}
