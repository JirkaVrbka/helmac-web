import { cache } from "react";
import { db } from "@/lib/db";

// ============================================================
// Types — year copy inventory return shape
// ============================================================

export interface YearCopyInventory {
    sourceYear: {
        id: string;
        year: number;
        title: string;
        startDate: Date | null;
        hasHeaderPhoto: boolean;
        hasHeroPhoto: boolean;
        hasSuccessContent: boolean;
    };
    sectionTypes: {
        id: string;
        label: string;
        slug: string;
        sectionCount: number;
        sections: { id: string; title: string }[];
    }[];
    homepageSteps: {
        id: string;
        title: string;
    }[];
    news: {
        id: string;
        title: string;
        slug: string;
        isPublished: boolean;
    }[];
    programDays: {
        id: string;
        label: string;
        date: Date;
        eventCount: number;
    }[];
    v2EmailTemplates: {
        id: string;
        name: string;
        type: string;
        enabled: boolean;
        isConditional: boolean;
    }[];
    registrationForm: {
        fieldCount: number;
        pricingDefinitionCount: number;
        tierCount: number;
        capacityLimitCount: number;
    } | null;
}

// ============================================================
// Service
// ============================================================

export const getYearCopyInventory = cache(
    async (sourceYearId: string): Promise<YearCopyInventory | null> => {
        const year = await db.year.findUnique({
            where: { id: sourceYearId },
            select: {
                id: true,
                year: true,
                title: true,
                startDate: true,
                headerPhoto: true,
                heroPhoto: true,
                registrationSuccessContent: true,
                sectionTypes: {
                    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
                    select: {
                        id: true,
                        label: true,
                        slug: true,
                        sections: {
                            orderBy: [
                                { sortOrder: "asc" },
                                { createdAt: "asc" },
                            ],
                            select: {
                                id: true,
                                title: true,
                            },
                        },
                    },
                },
                homepageSteps: {
                    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
                    select: {
                        id: true,
                        title: true,
                    },
                },
                news: {
                    orderBy: { createdAt: "asc" },
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        isPublished: true,
                    },
                },
                programDays: {
                    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
                    select: {
                        id: true,
                        label: true,
                        date: true,
                        _count: { select: { events: true } },
                    },
                },
                v2EmailTemplates: {
                    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        enabled: true,
                        conditionId: true,
                    },
                },
                registrationForm: {
                    select: {
                        _count: {
                            select: {
                                v2FormFields: true,
                                v2PricingDefinitions: true,
                                v2PriceTiers: true,
                                v2CapacityLimits: true,
                            },
                        },
                    },
                },
            },
        });

        if (!year) return null;

        const successContent = Array.isArray(year.registrationSuccessContent)
            ? year.registrationSuccessContent
            : [];

        return {
            sourceYear: {
                id: year.id,
                year: year.year,
                title: year.title,
                startDate: year.startDate,
                hasHeaderPhoto: !!year.headerPhoto,
                hasHeroPhoto: !!year.heroPhoto,
                hasSuccessContent: successContent.length > 0,
            },
            sectionTypes: year.sectionTypes.map((st) => ({
                id: st.id,
                label: st.label,
                slug: st.slug,
                sectionCount: st.sections.length,
                sections: st.sections,
            })),
            homepageSteps: year.homepageSteps,
            news: year.news,
            programDays: year.programDays.map((pd) => ({
                id: pd.id,
                label: pd.label,
                date: pd.date,
                eventCount: pd._count.events,
            })),
            v2EmailTemplates: year.v2EmailTemplates.map((t) => ({
                id: t.id,
                name: t.name,
                type: t.type,
                enabled: t.enabled,
                isConditional: t.conditionId != null,
            })),
            registrationForm: year.registrationForm
                ? {
                      fieldCount: year.registrationForm._count.v2FormFields,
                      pricingDefinitionCount:
                          year.registrationForm._count.v2PricingDefinitions,
                      tierCount: year.registrationForm._count.v2PriceTiers,
                      capacityLimitCount:
                          year.registrationForm._count.v2CapacityLimits,
                  }
                : null,
        };
    }
);
