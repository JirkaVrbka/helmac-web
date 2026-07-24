import { cache } from "react";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getApplicablePriceFromSummary } from "@/lib/utils/pricing";
import type {
    InputField,
    FormField,
    PricingDefinition,
    PricingSummaryData,
} from "@/lib/types/registration-form";

// ============================================================
// Types — v2 DB function return shapes
// ============================================================

export interface V2Summary {
    registrations: number;
    confirmed: number;
    pending: number;
    waitlist: number;
    paidTotal: number;
    unpaidTotal: number;
    people: number;
}

export interface V2OptionCountsResult {
    [fieldName: string]: {
        counts: Record<string, number>;
        capacityLimits: Record<string, number>;
    };
}

export interface V2FormField {
    id: string;
    legacyId: string | null;
    name: string;
    label: string;
    type: string;
    required: boolean;
    editable: boolean;
    pricingDefinitionId: string | null;
    includeForAdditionalPeople: boolean;
    options: string[];
    sortOrder: number;
}

export interface V2PricingDef {
    id: string;
    name: string;
    type?: string;
    multiSelect?: boolean;
    unitName?: string;
    options: {
        id: string;
        name: string;
        prices: { tierId: string; price: number }[];
    }[];
}

export interface V2PriceTier {
    id: string;
    deadline: string | null;
    sortOrder: number;
}

export interface V2FormCondition {
    id: string;
    name: string;
    rules: {
        fieldId: string;
        operator: string;
        value: string | null;
        connector: string;
    }[];
}

export interface V2FormStructure {
    layout: unknown;
    fields: V2FormField[];
    pricingDefinitions: V2PricingDef[];
    priceTiers: V2PriceTier[];
    conditions: V2FormCondition[];
    capacityLimits: {
        id: string;
        fieldId: string;
        optionValue: string;
        maxCount: number;
    }[];
}

export interface V2ValueRow {
    orderId: string;
    personId: string;
    fieldName: string;
    value: string;
}

export interface V2CapacityCheck {
    maxCount: number;
    currentCount: number;
    remaining: number;
    wouldExceed: boolean;
}

// ============================================================
// v2 DB function wrappers
// ============================================================

export async function getRegistrationSummary(
    yearId: string,
): Promise<V2Summary> {
    const rows = await db.$queryRaw<
        { v2_get_registration_summary: V2Summary }[]
    >(
        Prisma.sql`SELECT v2_get_registration_summary(${yearId}) AS v2_get_registration_summary`,
    );
    return (
        rows[0]?.v2_get_registration_summary ?? {
            registrations: 0,
            confirmed: 0,
            pending: 0,
            waitlist: 0,
            paidTotal: 0,
            unpaidTotal: 0,
            people: 0,
        }
    );
}

export async function getOptionCounts(
    yearId: string,
    fieldNames?: string[] | null,
    statuses?: string[] | null,
    isPaid?: boolean | null,
): Promise<V2OptionCountsResult> {
    const rows = await db.$queryRaw<
        { v2_get_option_counts: V2OptionCountsResult }[]
    >(
        Prisma.sql`SELECT v2_get_option_counts(
            ${yearId},
            ${fieldNames ?? Prisma.sql`NULL`}::text[],
            ${statuses ?? Prisma.sql`NULL`}::text[],
            ${isPaid ?? Prisma.sql`NULL`}::boolean
        ) AS v2_get_option_counts`,
    );
    return rows[0]?.v2_get_option_counts ?? {};
}

export async function getFormStructure(
    yearId: string,
): Promise<V2FormStructure | null> {
    const rows = await db.$queryRaw<
        { v2_get_form_structure: V2FormStructure | null }[]
    >(
        Prisma.sql`SELECT v2_get_form_structure(${yearId}) AS v2_get_form_structure`,
    );
    return rows[0]?.v2_get_form_structure ?? null;
}

export async function getValueRows(
    yearId: string,
    fieldNames: string[],
): Promise<V2ValueRow[]> {
    if (fieldNames.length === 0) return [];
    const rows = await db.$queryRaw<
        { v2_get_value_rows: V2ValueRow[] }[]
    >(
        Prisma.sql`SELECT v2_get_value_rows(${yearId}, ${fieldNames}::text[]) AS v2_get_value_rows`,
    );
    return rows[0]?.v2_get_value_rows ?? [];
}

export async function computeCurrentTotal(
    orderId: string,
): Promise<number> {
    const rows = await db.$queryRaw<
        { v2_compute_current_total: number }[]
    >(
        Prisma.sql`SELECT v2_compute_current_total(${orderId}) AS v2_compute_current_total`,
    );
    return rows[0]?.v2_compute_current_total ?? 0;
}

export async function checkCapacity(
    yearId: string,
    fieldName: string,
    optionValue: string,
    additional: number,
): Promise<V2CapacityCheck | null> {
    const rows = await db.$queryRaw<V2CapacityCheck[]>(
        Prisma.sql`SELECT
            max_count AS "maxCount",
            current_count AS "currentCount",
            remaining,
            would_exceed AS "wouldExceed"
        FROM v2_check_capacity(
            ${yearId}, ${fieldName}, ${optionValue}, ${additional}::int
        )`,
    );
    return rows[0] ?? null;
}

export async function findDuplicateEmail(
    yearId: string,
    emailFieldName: string,
    emailValue: string,
): Promise<boolean> {
    const rows = await db.$queryRaw<{ id: string }[]>(
        Prisma.sql`
            SELECT oli.id FROM v2_order_line_items oli
            JOIN v2_form_fields ff ON ff.id = oli.field_id
            JOIN v2_orders o ON o.id = oli.order_id
            JOIN v2_order_people op ON op.id = oli.person_id
            WHERE oli.year_id = ${yearId}
                AND ff.name = ${emailFieldName}
                AND LOWER(oli.value) = ${emailValue}
                AND o.order_type = 'registration'
                AND o.is_test = false
                AND o.status NOT IN ('CANCELLED', 'REJECTED')
                AND op.person_index = 0
            LIMIT 1
        `,
    );
    return rows.length > 0;
}

// ============================================================
// v2 model queries (typed wrappers around Prisma ORM)
// ============================================================

export async function countOrders(where: {
    yearId: string;
    isTest?: boolean;
    statusNotIn?: string[];
}): Promise<number> {
    return db.v2Order.count({
        where: {
            yearId: where.yearId,
            isTest: where.isTest ?? false,
            parentOrderId: null,
            orderType: "registration",
            status: {
                notIn: where.statusNotIn ?? [
                    "CANCELLED",
                    "REJECTED",
                ],
            },
        },
    });
}

export async function getUnpaidOrders(
): Promise<
    {
        id: string;
        yearId: string;
        totalPrice: number | null;
        variableSymbol: string | null;
        legacySubmissionId: string | null;
    }[]
> {
    return db.v2Order.findMany({
        where: {
            isPaid: false,
            isTest: false,
            status: { notIn: ["CANCELLED", "REJECTED"] },
            parentOrderId: null,
            orderType: "registration",
        },
        select: {
            id: true,
            yearId: true,
            totalPrice: true,
            variableSymbol: true,
            legacySubmissionId: true,
        },
    });
}

export async function updateOrderTotalPrice(
    orderId: string,
    legacySubmissionId: string | null,
    totalPrice: number,
): Promise<void> {
    await db.$transaction(async (tx) => {
        await tx.v2Order.update({
            where: { id: orderId },
            data: { totalPrice },
        });
        if (legacySubmissionId) {
            const sub = await tx.registrationSubmission.findUnique({
                where: { id: legacySubmissionId },
                select: { pricingSummary: true },
            });
            const pricingSummary = sub?.pricingSummary as unknown as PricingSummaryData | null;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updateData: Record<string, any> = { totalPrice };
            if (pricingSummary?.tiers) {
                const { applicableTierIndex } =
                    getApplicablePriceFromSummary(pricingSummary);
                updateData.pricingSummary = {
                    ...pricingSummary,
                    applicableTierIndex,
                    totalPrice,
                } as unknown as Prisma.InputJsonValue;
            }
            await tx.registrationSubmission.update({
                where: { id: legacySubmissionId },
                data: updateData,
            });
        }
    });
}

// ---- Order row shape for admin tables ----

export interface OrderPersonRow {
    id: string;
    personIndex: number;
    isAttending: boolean;
    values: Record<string, string>;
}

export interface OrderRow {
    id: string;
    legacySubmissionId: string | null;
    status: string;
    isPaid: boolean;
    paidAt: Date | null;
    totalPrice: number | null;
    variableSymbol: string | null;
    emailSent: boolean;
    adminNote: string | null;
    isTest: boolean;
    createdAt: Date;
    people: OrderPersonRow[];
}

export async function getOrdersForYear(
    yearId: string,
    options?: { isTest?: boolean | null },
): Promise<OrderRow[]> {
    const where: Prisma.V2OrderWhereInput = {
        yearId,
        parentOrderId: null,
        orderType: "registration",
    };
    if (options?.isTest !== null && options?.isTest !== undefined) {
        where.isTest = options.isTest;
    }

    const orders = await db.v2Order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            legacySubmissionId: true,
            status: true,
            isPaid: true,
            paidAt: true,
            totalPrice: true,
            variableSymbol: true,
            emailSent: true,
            adminNote: true,
            isTest: true,
            createdAt: true,
            people: {
                orderBy: { personIndex: "asc" },
                select: {
                    id: true,
                    personIndex: true,
                    isAttending: true,
                    lineItems: {
                        select: {
                            value: true,
                            quantity: true,
                            field: {
                                select: { name: true },
                            },
                            pricingOption: {
                                select: { name: true },
                            },
                        },
                    },
                },
            },
        },
    });

    return orders.map((o) => ({
        id: o.id,
        legacySubmissionId: o.legacySubmissionId,
        status: o.status,
        isPaid: o.isPaid,
        paidAt: o.paidAt,
        totalPrice: o.totalPrice,
        variableSymbol: o.variableSymbol,
        emailSent: o.emailSent,
        adminNote: o.adminNote,
        isTest: o.isTest,
        createdAt: o.createdAt,
        people: o.people.map((p) => {
            const values: Record<string, string> = {};
            for (const li of p.lineItems) {
                const name = li.field.name;
                const optName =
                    li.pricingOption?.name ??
                    li.value ??
                    "";
                const val =
                    li.quantity > 1
                        ? `${optName} ×${li.quantity}`
                        : optName;
                if (values[name]) {
                    values[name] += `, ${val}`;
                } else {
                    values[name] = val;
                }
            }
            return {
                id: p.id,
                personIndex: p.personIndex,
                isAttending: p.isAttending,
                values,
            };
        }),
    }));
}

export interface UnpaidOrderOption {
    id: string;
    variableSymbol: string | null;
    totalPrice: number | null;
    legacySubmissionId: string | null;
    label: string;
    partiallyPaid: boolean;
}

export async function getUnpaidOrdersForYear(
    yearId: string,
): Promise<UnpaidOrderOption[]> {
    const orders = await db.v2Order.findMany({
        where: {
            yearId,
            isPaid: false,
            isTest: false,
        },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            variableSymbol: true,
            totalPrice: true,
            legacySubmissionId: true,
            _count: { select: { bankTransactions: true } },
            people: {
                where: { personIndex: 0 },
                select: {
                    lineItems: {
                        select: {
                            value: true,
                            field: {
                                select: {
                                    type: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    const textTypes = new Set([
        "text",
        "shorttext",
        "email",
    ]);

    return orders.map((o) => {
        const textValues =
            o.people[0]?.lineItems
                .filter(
                    (li) =>
                        li.value &&
                        textTypes.has(li.field.type),
                )
                .slice(0, 2)
                .map((li) => li.value!) ?? [];
        return {
            id: o.id,
            variableSymbol: o.variableSymbol,
            totalPrice: o.totalPrice,
            legacySubmissionId: o.legacySubmissionId,
            label: textValues.join(" "),
            partiallyPaid: o._count.bankTransactions > 0,
        };
    });
}

export async function getFilteredOrderSummary(
    yearId: string,
    statuses: string[] | null,
    isPaid: boolean | null,
): Promise<V2Summary> {
    const statusFilter = statuses
        ? Prisma.sql`AND o.status = ANY(${statuses}::text[])`
        : Prisma.sql`AND o.status NOT IN ('CANCELLED', 'REJECTED')`;
    const paidFilter =
        isPaid !== null
            ? Prisma.sql`AND o.is_paid = ${isPaid}`
            : Prisma.empty;

    const rows = await db.$queryRaw<
        {
            registrations: bigint;
            confirmed: bigint;
            pending: bigint;
            waitlist: bigint;
            paid_total: bigint;
            unpaid_total: bigint;
            people: bigint;
        }[]
    >(
        Prisma.sql`
            SELECT
                COUNT(*) AS registrations,
                COUNT(*) FILTER (WHERE o.status = 'CONFIRMED') AS confirmed,
                COUNT(*) FILTER (WHERE o.status = 'PENDING') AS pending,
                COUNT(*) FILTER (WHERE o.status = 'WAITLIST') AS waitlist,
                COALESCE(SUM(o.total_price) FILTER (WHERE o.is_paid), 0) AS paid_total,
                COALESCE(SUM(o.total_price) FILTER (WHERE NOT o.is_paid), 0) AS unpaid_total,
                COALESCE((
                    SELECT COUNT(DISTINCT op.id)
                    FROM v2_order_people op
                    WHERE op.order_id = ANY(ARRAY_AGG(o.id))
                ), 0) AS people
            FROM v2_orders o
            WHERE o.year_id = ${yearId}
                AND o.is_test = false
                AND o.parent_order_id IS NULL
                AND o.order_type = 'registration'
                ${statusFilter}
                ${paidFilter}
        `,
    );

    const row = rows[0];
    if (!row) {
        return {
            registrations: 0,
            confirmed: 0,
            pending: 0,
            waitlist: 0,
            paidTotal: 0,
            unpaidTotal: 0,
            people: 0,
        };
    }

    return {
        registrations: Number(row.registrations),
        confirmed: Number(row.confirmed),
        pending: Number(row.pending),
        waitlist: Number(row.waitlist),
        paidTotal: Number(row.paid_total),
        unpaidTotal: Number(row.unpaid_total),
        people: Number(row.people),
    };
}

// ============================================================
// Converters — map v2 types to legacy component-facing types
// ============================================================

export function v2FieldToInputField(f: V2FormField): InputField {
    return {
        type: f.type as InputField["type"],
        id: f.legacyId ?? f.id,
        name: f.name,
        label: f.label,
        required: f.required,
        editable: f.editable,
        options: f.options,
        pricingId: f.pricingDefinitionId ?? undefined,
        includeForAdditionalPeople: f.includeForAdditionalPeople,
    };
}

export function v2FieldsToFormFields(
    fields: V2FormField[],
): FormField[] {
    return fields.map(v2FieldToInputField);
}

export function v2PricingDefsToPricingDefs(
    defs: V2PricingDef[],
): PricingDefinition[] {
    return defs.map((d) => ({
        id: d.id,
        name: d.name,
        type: (d.type ?? "options") as "options" | "quantity",
        multiSelect: d.multiSelect,
        unitName: d.unitName,
        usePriceTiers: false,
        // prices not needed for admin pages — only option names/IDs
        options: d.options.map((o) => ({
            id: o.id,
            name: o.name,
            description: "",
            prices: [],
        })),
    }));
}

// ============================================================
// Order detail (single order by legacy submission ID)
// ============================================================

export interface OrderDetailLineItem {
    fieldId: string;
    fieldName: string;
    fieldLabel: string;
    fieldType: string;
    fieldIsActive: boolean;
    fieldSortOrder: number;
    fieldOptions: string[];
    fieldPricingDefinitionId: string | null;
    fieldIncludeForAP: boolean;
    value: string | null;
    quantity: number;
    pricingOptionId: string | null;
    pricingOptionName: string | null;
    unitPriceAtSubmission: number;
}

export interface OrderDetailPerson {
    id: string;
    personIndex: number;
    isAttending: boolean;
    lineItems: OrderDetailLineItem[];
}

export interface OrderBankTransaction {
    id: string;
    date: Date;
    amount: number;
    currency: string;
    variableSymbol: string | null;
    counterpartAccount: string | null;
    counterpartName: string | null;
    matchStatus: string;
}

export interface OrderDetail {
    id: string;
    legacySubmissionId: string | null;
    status: string;
    isPaid: boolean;
    paidAt: Date | null;
    totalPrice: number | null;
    variableSymbol: string | null;
    emailSent: boolean;
    emailSentAt: Date | null;
    adminNote: string | null;
    isTest: boolean;
    createdAt: Date;
    yearId: string;
    yearNumber: number;
    yearTitle: string;
    pricingSummary: unknown;
    bankTransactions: OrderBankTransaction[];
    people: OrderDetailPerson[];
    pricingDefinitions: V2PricingDef[];
    priceTiers: V2PriceTier[];
    conditions: V2FormCondition[];
    formLayout: unknown;
    allFields: {
        id: string;
        name: string;
        label: string;
        type: string;
        isActive: boolean;
        sortOrder: number;
        options: string[];
        pricingDefinitionId: string | null;
        includeForAdditionalPeople: boolean;
    }[];
}

export const getOrderByLegacyId = cache(async function getOrderByLegacyId(
    legacySubmissionId: string,
): Promise<OrderDetail | null> {
    const order = await db.v2Order.findFirst({
        where: { legacySubmissionId },
        select: {
            id: true,
            legacySubmissionId: true,
            status: true,
            isPaid: true,
            paidAt: true,
            totalPrice: true,
            variableSymbol: true,
            emailSent: true,
            emailSentAt: true,
            adminNote: true,
            isTest: true,
            createdAt: true,
            yearId: true,
            year: {
                select: { year: true, title: true },
            },
            bankTransactions: {
                orderBy: { date: "desc" },
                select: {
                    id: true,
                    date: true,
                    amount: true,
                    currency: true,
                    variableSymbol: true,
                    counterpartAccount: true,
                    counterpartName: true,
                    matchStatus: true,
                },
            },
            people: {
                orderBy: { personIndex: "asc" },
                select: {
                    id: true,
                    personIndex: true,
                    isAttending: true,
                    lineItems: {
                        orderBy: {
                            field: { sortOrder: "asc" },
                        },
                        select: {
                            value: true,
                            quantity: true,
                            unitPriceAtSubmission: true,
                            pricingOptionId: true,
                            pricingOption: {
                                select: {
                                    name: true,
                                },
                            },
                            field: {
                                select: {
                                    id: true,
                                    name: true,
                                    label: true,
                                    type: true,
                                    isActive: true,
                                    sortOrder: true,
                                    options: true,
                                    pricingDefinitionId:
                                        true,
                                    includeForAdditionalPeople:
                                        true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!order) return null;

    const [legacySub, formStructure] = await Promise.all([
        db.registrationSubmission.findUnique({
            where: { id: legacySubmissionId },
            select: { pricingSummary: true },
        }),
        getFormStructure(order.yearId),
    ]);
    const pricingDefs =
        formStructure?.pricingDefinitions ?? [];

    return {
        id: order.id,
        legacySubmissionId: order.legacySubmissionId,
        status: order.status,
        isPaid: order.isPaid,
        paidAt: order.paidAt,
        totalPrice: order.totalPrice,
        variableSymbol: order.variableSymbol,
        emailSent: order.emailSent,
        emailSentAt: order.emailSentAt ?? null,
        adminNote: order.adminNote,
        isTest: order.isTest,
        createdAt: order.createdAt,
        yearId: order.yearId,
        yearNumber: order.year.year,
        yearTitle: order.year.title,
        pricingSummary: legacySub?.pricingSummary ?? null,
        bankTransactions: order.bankTransactions,
        people: order.people.map((p) => ({
            id: p.id,
            personIndex: p.personIndex,
            isAttending: p.isAttending,
            lineItems: p.lineItems.map((li) => ({
                fieldId: li.field.id,
                fieldName: li.field.name,
                fieldLabel: li.field.label,
                fieldType: li.field.type,
                fieldIsActive: li.field.isActive,
                fieldSortOrder: li.field.sortOrder,
                fieldOptions: li.field.options,
                fieldPricingDefinitionId:
                    li.field.pricingDefinitionId,
                fieldIncludeForAP:
                    li.field.includeForAdditionalPeople,
                value: li.value,
                quantity: li.quantity,
                pricingOptionId: li.pricingOptionId,
                pricingOptionName:
                    li.pricingOption?.name ?? null,
                unitPriceAtSubmission:
                    li.unitPriceAtSubmission,
            })),
        })),
        pricingDefinitions: pricingDefs,
        priceTiers: formStructure?.priceTiers ?? [],
        conditions: formStructure?.conditions ?? [],
        formLayout: formStructure?.layout ?? null,
        allFields: (formStructure?.fields ?? []).map(
            (f) => ({
                id: f.id,
                name: f.name,
                label: f.label,
                type: f.type,
                isActive: true,
                sortOrder: f.sortOrder,
                options: f.options,
                pricingDefinitionId:
                    f.pricingDefinitionId,
                includeForAdditionalPeople:
                    f.includeForAdditionalPeople,
            }),
        ),
    };
});

// ============================================================
// Email templates from v2
// ============================================================

export interface V2EmailTemplate {
    id: string;
    type: string;
    name: string;
    enabled: boolean;
    subject: string | null;
    body: string | null;
    bcc: string | null;
    accountId: string | null;
    attachments: unknown;
    sections: V2EmailSection[];
    condition: V2EmailCondition | null;
}

export interface V2EmailSection {
    id: string;
    body: string;
    sortOrder: number;
    attachments: unknown;
    condition: V2EmailCondition | null;
}

export interface V2EmailCondition {
    id: string;
    name: string;
    rules: {
        fieldId: string | null;
        operator: string;
        value: string | null;
        connector: string;
    }[];
}

export async function getEmailTemplate(
    yearId: string,
    type: string,
): Promise<V2EmailTemplate | null> {
    const template = await db.v2EmailTemplate.findFirst({
        where: { yearId, type },
        include: {
            sections: {
                orderBy: { sortOrder: "asc" },
                include: {
                    condition: {
                        include: {
                            rules: {
                                orderBy: { sortOrder: "asc" },
                            },
                        },
                    },
                },
            },
            condition: {
                include: {
                    rules: {
                        orderBy: { sortOrder: "asc" },
                    },
                },
            },
        },
    });
    return template as V2EmailTemplate | null;
}

export async function getConditionalEmailTemplates(
    yearId: string,
): Promise<V2EmailTemplate[]> {
    const templates = await db.v2EmailTemplate.findMany({
        where: { yearId, type: "conditional", enabled: true },
        include: {
            sections: {
                orderBy: { sortOrder: "asc" },
                include: {
                    condition: {
                        include: {
                            rules: {
                                orderBy: { sortOrder: "asc" },
                            },
                        },
                    },
                },
            },
            condition: {
                include: {
                    rules: {
                        orderBy: { sortOrder: "asc" },
                    },
                },
            },
        },
    });
    return templates as V2EmailTemplate[];
}

// Convert v2 email condition to FormCondition for evaluateCondition()
export function v2ConditionToFormCondition(
    cond: V2EmailCondition,
    fieldIdToLegacyId: Map<string, string>,
): import("@/lib/types/registration-form").FormCondition {
    return {
        id: cond.id,
        name: cond.name,
        rules: cond.rules.map((r) => ({
            type: "field_value" as const,
            fieldId: r.fieldId
                ? (fieldIdToLegacyId.get(r.fieldId) ?? r.fieldId)
                : undefined,
            operator: r.operator as import("@/lib/types/registration-form").ConditionRule["operator"],
            value: r.value ?? undefined,
            connector: r.connector as "AND" | "OR",
        })),
    };
}

// Convert v2 email sections to EmailConditionalSection[] for appendConditionalSections()
export function v2SectionsToLegacy(
    sections: V2EmailSection[],
    fieldIdToLegacyId: Map<string, string>,
): import("@/lib/types/email-sections").EmailConditionalSection[] {
    return sections.map((s) => ({
        id: s.id,
        condition: s.condition
            ? v2ConditionToFormCondition(s.condition, fieldIdToLegacyId)
            : { id: "", name: "", rules: [] },
        body: s.body,
        sortOrder: s.sortOrder,
        attachments: (s.attachments as import("@/lib/validators/email-attachment").EmailAttachment[]) ?? [],
    }));
}

// Build a fieldId → legacyId map for a year's form fields
export async function getFieldIdToLegacyIdMap(
    yearId: string,
): Promise<Map<string, string>> {
    const fields = await db.v2FormField.findMany({
        where: { year: { id: yearId }, isActive: true },
        select: { id: true, legacyId: true },
    });
    return new Map(
        fields
            .filter((f) => f.legacyId)
            .map((f) => [f.id, f.legacyId!]),
    );
}
