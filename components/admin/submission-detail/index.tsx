"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    Box,
    Button,
    FormControlLabel,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    Alert,
    IconButton,
    Tab,
    Tabs,
    Divider,
    CircularProgress,
    Switch,
    Grid,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
} from "@mui/material";
import {
    Save,
    Delete,
    Person,
    AccountBalance,
    HowToReg,
    PersonOutline,
} from "@mui/icons-material";
import type { RegistrationStatus } from "@prisma/client";
import type { PricingSummaryData } from "@/lib/types/registration-form";
import type {
    FormField as LegacyFormField,
    RegistrationFormData,
} from "@/lib/types/registration-form";
import { getAllFields } from "@/lib/types/registration-form";
import { migrateFormData } from "@/lib/utils/form-migration";
import {
    useConditionalFields,
    evaluateAPVisibleFields,
} from "@/components/public/features/registration/useConditionalFields";
import {
    updateSubmissionData,
    updateSubmissionStatus,
    toggleSubmissionPayment,
    deleteSubmission,
    resendConfirmationEmail,
    togglePersonIsAttending,
} from "@/lib/actions/registration-submissions";
import { SubmissionPricingSummary } from "@/components/admin/submission-pricing-summary";
import { AdminNoteDetail } from "@/components/admin/admin-note-detail";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

import type { FieldMeta, PersonState, SubmissionDetailProps } from "./types";
import { STATUS_OPTIONS } from "./types";
import {
    buildPersonState,
    buildFields,
    extractSections,
    personStateToLegacyData,
    formatDateTime,
    getCurrentTierId,
    computeTotal,
} from "./helpers";
import { FieldRenderer } from "./field-renderer";

export type { SubmissionDetailProps };

// ── Builder-palette shared styles (admin design system) ──

// Pane: white surface, 1px border, 14px radius.
const paneSx = {
    backgroundColor: p.surface,
    border: `1px solid ${p.line}`,
    borderRadius: "14px",
    overflow: "hidden",
};

// Kicker label — signature section-header treatment.
const kickerSx = {
    fontSize: 11,
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    fontWeight: 700,
    color: p.ink3,
};

// Primary action — solid indigo.
const primaryBtnSx = {
    backgroundColor: p.indigo,
    color: p.surface,
    borderRadius: "10px",
    boxShadow: "none",
    "&:hover": {
        backgroundColor: "#4338ca",
        boxShadow: "none",
    },
};

// Ghost / secondary button.
const ghostBtnSx = {
    backgroundColor: p.surface,
    border: `1px solid ${p.line}`,
    color: p.ink2,
    borderRadius: "10px",
    boxShadow: "none",
    "&:hover": {
        backgroundColor: p.surface2,
        borderColor: p.ink3,
        boxShadow: "none",
    },
};

// Soft-danger confirm button (destructive dialog action).
const softDangerBtnSx = {
    backgroundColor: p.neg,
    color: p.negInk,
    borderRadius: "10px",
    boxShadow: "none",
    "&:hover": {
        backgroundColor: "#fecaca",
        boxShadow: "none",
    },
};

const dialogPaperProps = {
    sx: { borderRadius: "14px" },
};

// Mono numeric atom (price, VS).
const monoSx = {
    fontFamily: "'JetBrains Mono', monospace",
};

// Round status badge with a leading dot, colour-coded by meaning.
function StatusBadge({
    label,
    bg,
    fg,
}: {
    label: string;
    bg: string;
    fg: string;
}) {
    return (
        <Box
            component="span"
            sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                px: "9px",
                py: "3px",
                borderRadius: "20px",
                fontSize: 11,
                fontWeight: 600,
                backgroundColor: bg,
                color: fg,
            }}
        >
            <Box
                component="span"
                sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: "currentColor",
                }}
            />
            {label}
        </Box>
    );
}

export function SubmissionDetail({
    order,
    yearId,
    readOnly,
}: SubmissionDetailProps) {
    const router = useRouter();
    const fields = useMemo(() => buildFields(order), [order]);
    const fieldByName = useMemo(
        () => new Map(fields.map((f) => [f.name, f])),
        [fields]
    );
    const pricingDefById = useMemo(
        () => new Map(order.pricingDefinitions.map((d) => [d.id, d])),
        [order.pricingDefinitions]
    );
    const v2OptionIdByDefAndName = useMemo(() => {
        const map = new Map<string, Map<string, string>>();
        for (const def of order.pricingDefinitions) {
            const optMap = new Map<string, string>();
            for (const opt of def.options) {
                optMap.set(opt.name, opt.id);
            }
            map.set(def.name, optMap);
        }
        return map;
    }, [order.pricingDefinitions]);

    const [personStates, setPersonStates] = useState<PersonState[]>(() =>
        order.people.map(buildPersonState)
    );
    const [attendance, setAttendance] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(order.people.map((p) => [p.id, p.isAttending]))
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [currentStatus, setCurrentStatus] = useState(order.status);
    const [currentPaid, setCurrentPaid] = useState(order.isPaid);
    const [actionLoading, setActionLoading] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [removePersonIdx, setRemovePersonIdx] = useState<number | null>(null);
    const [emailSending, setEmailSending] = useState(false);

    const isLoading = saving || actionLoading;

    const currentTierId = useMemo(
        () =>
            getCurrentTierId(
                order.priceTiers,
                order.paidAt ? new Date(order.paidAt) : undefined
            ),
        [order.priceTiers, order.paidAt]
    );
    const apFields = fields.filter((f) => f.includeForAP);

    const formData = useMemo((): RegistrationFormData | null => {
        if (!order.formLayout) return null;
        return migrateFormData(order.formLayout);
    }, [order.formLayout]);

    const formDataForConditions = useMemo((): RegistrationFormData | null => {
        if (!formData) return null;
        const v2Defs = order.pricingDefinitions;
        const mergedDefs = formData.pricingDefinitions.map((legacyDef, di) => {
            let v2OptMap = v2OptionIdByDefAndName.get(legacyDef.name);
            if (!v2OptMap && di < v2Defs.length) {
                const fallback = v2Defs[di];
                v2OptMap = new Map(fallback.options.map((o) => [o.name, o.id]));
            }
            if (!v2OptMap) return legacyDef;
            return {
                ...legacyDef,
                options: legacyDef.options.map((opt) => {
                    const v2Id = v2OptMap!.get(opt.name);
                    return v2Id
                        ? {
                              ...opt,
                              id: v2Id,
                          }
                        : opt;
                }),
            };
        });
        return {
            ...formData,
            pricingDefinitions: mergedDefs,
        };
    }, [formData, v2OptionIdByDefAndName, order.pricingDefinitions]);

    const mainValues = useMemo(() => {
        const state = personStates[0];
        if (!state) return {} as Record<string, string | number | boolean>;
        return personStateToLegacyData(state, fields) as Record<
            string,
            string | number | boolean
        >;
    }, [personStates, fields]);

    const { visibleFields } = useConditionalFields(
        formDataForConditions ?? {
            fields: [],
            conditions: [],
            pricingDefinitions: [],
            capacityLimits: [],
            showOptionCounts: [],
            priceTiers: [],
        },
        mainValues
    );

    const allFieldNames = useMemo(
        () => new Set(fields.map((f) => f.name)),
        [fields]
    );
    const apFieldNames = useMemo(
        () => new Set(apFields.map((f) => f.name)),
        [apFields]
    );

    const idToName = useMemo(() => {
        if (!formData) return null;
        const legacyFields = getAllFields(formData.fields);
        return new Map(
            legacyFields
                .filter(
                    (
                        f
                    ): f is LegacyFormField & {
                        name: string;
                    } => "name" in f
                )
                .map((f) => [f.id, (f as { name: string }).name])
        );
    }, [formData]);

    const idsToNames = (ids: Set<string>) => {
        if (!idToName) return allFieldNames;
        const names = new Set<string>();
        for (const id of ids) {
            const name = idToName.get(id);
            if (name) names.add(name);
        }
        return names;
    };

    const visibleFieldNames = useMemo(
        () => idsToNames(visibleFields),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [visibleFields, idToName, allFieldNames]
    );

    const apVisibleFieldNames = useMemo(() => {
        if (!formDataForConditions) return personStates.map(() => apFieldNames);
        return personStates.slice(1).map((state) => {
            const apData = personStateToLegacyData(state, apFields);
            const merged = {
                ...mainValues,
                ...apData,
            } as Record<string, string | number | boolean>;
            const ids = evaluateAPVisibleFields(formDataForConditions, merged);
            return idsToNames(ids);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        formDataForConditions,
        personStates,
        mainValues,
        apFields,
        idToName,
        allFieldNames,
        apFieldNames,
    ]);

    const allVisibleFields = useMemo(
        () => [visibleFieldNames, ...apVisibleFieldNames],
        [visibleFieldNames, apVisibleFieldNames]
    );

    const mainSections = extractSections(order.formLayout, allFieldNames);
    const apSections = extractSections(order.formLayout, apFieldNames);
    const layoutFieldNames = useMemo(
        () => new Set(mainSections.flatMap((s) => s.fieldNames)),
        [mainSections]
    );

    const computedPrice = useMemo(
        () =>
            computeTotal(
                personStates,
                fields,
                pricingDefById,
                currentTierId,
                allVisibleFields,
                layoutFieldNames
            ),
        [
            personStates,
            fields,
            pricingDefById,
            currentTierId,
            allVisibleFields,
            layoutFieldNames,
        ]
    );
    const dynamicPricingSummary = useMemo((): PricingSummaryData | null => {
        if (order.priceTiers.length === 0) return null;
        const tiers = order.priceTiers.map((tier) => ({
            tierDate: tier.deadline,
            totalPrice: computeTotal(
                personStates,
                fields,
                pricingDefById,
                tier.id,
                allVisibleFields,
                layoutFieldNames
            ),
        }));
        const tierIdx = currentTierId
            ? order.priceTiers.findIndex((t) => t.id === currentTierId)
            : tiers.length - 1;
        return {
            tiers,
            applicableTierIndex: tierIdx >= 0 ? tierIdx : tiers.length - 1,
            totalPrice: computedPrice,
        };
    }, [
        order.priceTiers,
        personStates,
        fields,
        pricingDefById,
        currentTierId,
        allVisibleFields,
        layoutFieldNames,
        computedPrice,
    ]);

    const archivedFields = fields.filter(
        (f) => !f.isActive || !layoutFieldNames.has(f.name)
    );

    // ---- State updaters ----

    const updateValue = (
        personIdx: number,
        fieldName: string,
        value: string
    ) => {
        setPersonStates((prev) => {
            const updated = [...prev];
            updated[personIdx] = {
                ...updated[personIdx],
                values: {
                    ...updated[personIdx].values,
                    [fieldName]: value,
                },
            };
            return updated;
        });
    };

    const updateQuantity = (
        personIdx: number,
        fieldName: string,
        optionId: string,
        qty: number
    ) => {
        setPersonStates((prev) => {
            const updated = [...prev];
            const fieldQty = {
                ...(updated[personIdx].quantities[fieldName] ?? {}),
            };
            if (qty > 0) {
                fieldQty[optionId] = qty;
            } else {
                delete fieldQty[optionId];
            }
            updated[personIdx] = {
                ...updated[personIdx],
                quantities: {
                    ...updated[personIdx].quantities,
                    [fieldName]: fieldQty,
                },
            };
            return updated;
        });
    };

    const updateMultiSelect = (
        personIdx: number,
        fieldName: string,
        selected: string[]
    ) => {
        setPersonStates((prev) => {
            const updated = [...prev];
            updated[personIdx] = {
                ...updated[personIdx],
                multiSelects: {
                    ...updated[personIdx].multiSelects,
                    [fieldName]: selected,
                },
            };
            return updated;
        });
    };

    const handleRemovePerson = (personIdx: number) => {
        setPersonStates((prev) => {
            const next = prev.filter((_, i) => i !== personIdx);
            setActiveTab((tab) => Math.min(tab, next.length - 1));
            return next;
        });
    };

    // ---- Actions ----

    const legacyId = order.legacySubmissionId;

    const handleSave = async () => {
        if (!legacyId) return;
        setSaving(true);
        setError(null);
        setSuccess(false);

        const mainState = personStates[0];
        const mainData = mainState
            ? personStateToLegacyData(mainState, fields)
            : {};

        const visibleMain = allVisibleFields[0];
        if (visibleMain) {
            for (const field of fields) {
                if (
                    layoutFieldNames.has(field.name) &&
                    !visibleMain.has(field.name)
                ) {
                    delete mainData[field.name];
                }
            }
        }

        const apLayoutFieldNames = new Set(
            apSections.flatMap((s) => s.fieldNames)
        );
        const apStates = personStates.slice(1);
        if (apStates.length > 0) {
            mainData.additionalPeople = apStates.map((s, i) => {
                const apData = personStateToLegacyData(s, apFields);
                const visibleAP = allVisibleFields[i + 1];
                if (visibleAP) {
                    for (const field of apFields) {
                        if (
                            apLayoutFieldNames.has(field.name) &&
                            !visibleAP.has(field.name)
                        ) {
                            delete apData[field.name];
                        }
                    }
                }
                return apData;
            });
        }

        // Resolve V2 option IDs to option names so
        // the saved JSON is compatible with email
        // templates that use legacy pricing defs.
        function resolveV2IdsToNames(
            data: Record<string, unknown>,
            fieldList: typeof fields
        ) {
            for (const field of fieldList) {
                if (!field.pricingDefinitionId) continue;
                const def = pricingDefById.get(field.pricingDefinitionId);
                if (!def) continue;
                const val = data[field.name];
                if (val === undefined || val === null || val === "") continue;
                if (field.type === "pricing_select") {
                    const key = String(val);
                    let opt = def.options.find((o) => o.id === key);
                    if (!opt) {
                        for (const d of order.pricingDefinitions) {
                            opt = d.options.find((o) => o.id === key);
                            if (opt) break;
                        }
                    }
                    if (opt) data[field.name] = opt.name;
                }
            }
        }
        resolveV2IdsToNames(mainData, fields);
        if (Array.isArray(mainData.additionalPeople)) {
            for (const apData of mainData.additionalPeople as Record<
                string,
                unknown
            >[]) {
                resolveV2IdsToNames(apData, apFields);
            }
        }

        const result = await updateSubmissionData(legacyId!, mainData);

        if (result.error) {
            setError(result.error);
            setSaving(false);
            return;
        }

        const survivingPeople = personStates
            .map((s) =>
                order.people.find((p) => p.personIndex === s.personIndex)
            )
            .filter((p): p is NonNullable<typeof p> => !!p);
        const attendanceUpdates = survivingPeople
            .filter((p) => attendance[p.id] !== p.isAttending)
            .map((p) => togglePersonIsAttending(p.id, attendance[p.id]));
        if (attendanceUpdates.length > 0) {
            const results = await Promise.all(attendanceUpdates);
            const failed = results.find((r) => r.error);
            if (failed) {
                setError(failed.error!);
                setSaving(false);
                return;
            }
        }

        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        setSaving(false);
        router.refresh();
    };

    const handleStatusChange = async (newStatus: RegistrationStatus) => {
        if (!legacyId) return;
        setActionLoading(true);
        setError(null);
        const result = await updateSubmissionStatus(legacyId!, newStatus);
        if (result.error) {
            setError(result.error);
        } else {
            setCurrentStatus(newStatus);
        }
        setActionLoading(false);
    };

    const handlePaymentToggle = async () => {
        if (!legacyId) return;
        setActionLoading(true);
        setError(null);
        const newPaid = !currentPaid;
        const result = await toggleSubmissionPayment(legacyId!, newPaid);
        if (result.error) {
            setError(result.error);
        } else {
            setCurrentPaid(newPaid);
        }
        setActionLoading(false);
    };

    const handleDelete = async () => {
        if (!legacyId) return;
        setDeleteOpen(false);
        setActionLoading(true);
        const result = await deleteSubmission(legacyId!);
        if (result.error) {
            setError(result.error);
            setActionLoading(false);
        } else {
            router.push(`/admin/rocniky/${yearId}/registrace/prihlasky`);
        }
    };

    const handleResendEmail = async () => {
        if (!legacyId) return;
        setEmailSending(true);
        setError(null);
        const result = await resendConfirmationEmail(legacyId!);
        if (result.error) {
            setError(result.error);
        } else {
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        }
        setEmailSending(false);
    };

    // ---- Render helpers ----

    const renderField = (
        field: FieldMeta,
        state: PersonState,
        personIdx: number
    ) => (
        <FieldRenderer
            key={field.id}
            field={field}
            value={state.values[field.name] ?? ""}
            quantities={state.quantities[field.name]}
            multiSelected={state.multiSelects[field.name]}
            pricingDef={
                field.pricingDefinitionId
                    ? (pricingDefById.get(field.pricingDefinitionId) ??
                      undefined)
                    : undefined
            }
            onChange={(v) => updateValue(personIdx, field.name, v)}
            onQuantityChange={(optId, qty) =>
                updateQuantity(personIdx, field.name, optId, qty)
            }
            onMultiSelectChange={(sel) =>
                updateMultiSelect(personIdx, field.name, sel)
            }
            disabled={readOnly || !field.isActive}
        />
    );

    const personLabel = (idx: number) =>
        idx === 0 ? "Hlavní osoba" : `Osoba č. ${idx + 1}`;

    // ---- Render ----

    return (
        <Box>
            {error && (
                <Alert
                    severity="error"
                    sx={{ mb: 2 }}
                    onClose={() => setError(null)}
                >
                    {error}
                </Alert>
            )}
            {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    Data byla uložena
                </Alert>
            )}

            <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                    {order.isTest && (
                        <Box
                            component="span"
                            sx={{
                                display: "inline-flex",
                                mb: 2,
                                px: "9px",
                                py: "3px",
                                borderRadius: "6px",
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: "0.08em",
                                backgroundColor: p.warnSoft,
                                color: p.warnInk,
                            }}
                        >
                            TEST
                        </Box>
                    )}

                    <Tabs
                        value={activeTab}
                        onChange={(_, v: number) => setActiveTab(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            borderBottom: `1px solid ${p.line}`,
                            mb: 2,
                            "& .MuiTab-root": {
                                color: p.ink2,
                            },
                            "& .MuiTab-root.Mui-selected": {
                                color: p.indigo,
                            },
                            "& .MuiTabs-indicator": {
                                backgroundColor: p.indigo,
                            },
                        }}
                    >
                        {personStates.map((_, idx) => (
                            <Tab
                                key={idx}
                                icon={<Person fontSize="small" />}
                                iconPosition="start"
                                label={
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                        }}
                                    >
                                        {personLabel(idx)}
                                        {idx > 0 && !readOnly && (
                                            <Box
                                                component="span"
                                                onClick={(
                                                    e: React.MouseEvent
                                                ) => {
                                                    e.stopPropagation();
                                                    setRemovePersonIdx(idx);
                                                }}
                                                sx={{
                                                    ml: 0.5,
                                                    display: "inline-flex",
                                                    cursor: "pointer",
                                                    color: p.negInk,
                                                    "&:hover": {
                                                        opacity: 0.7,
                                                    },
                                                }}
                                            >
                                                <Delete
                                                    sx={{
                                                        fontSize: 16,
                                                    }}
                                                />
                                            </Box>
                                        )}
                                    </Box>
                                }
                                sx={{
                                    minHeight: 48,
                                }}
                            />
                        ))}
                    </Tabs>

                    {personStates.map((state, idx) => {
                        const person = order.people.find(
                            (p) => p.personIndex === state.personIndex
                        );
                        const personAttending = person
                            ? (attendance[person.id] ?? false)
                            : false;
                        return (
                            <Paper
                                key={idx}
                                role="tabpanel"
                                hidden={activeTab !== idx}
                                elevation={0}
                                sx={{ ...paneSx, p: 3 }}
                            >
                                {person && !readOnly && (
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            mb: 2,
                                        }}
                                    >
                                        <Button
                                            size="small"
                                            startIcon={
                                                personAttending ? (
                                                    <HowToReg fontSize="small" />
                                                ) : (
                                                    <PersonOutline fontSize="small" />
                                                )
                                            }
                                            onClick={() =>
                                                setAttendance((prev) => ({
                                                    ...prev,
                                                    [person.id]:
                                                        !personAttending,
                                                }))
                                            }
                                            sx={
                                                personAttending
                                                    ? {
                                                          backgroundColor:
                                                              p.value,
                                                          color: p.valueInk,
                                                          borderRadius: "10px",
                                                          boxShadow: "none",
                                                          "&:hover": {
                                                              backgroundColor:
                                                                  p.value,
                                                              boxShadow: "none",
                                                              filter: "brightness(0.97)",
                                                          },
                                                      }
                                                    : ghostBtnSx
                                            }
                                        >
                                            {personAttending
                                                ? "Označit: nepřijel"
                                                : "Označit: přijel"}
                                        </Button>
                                    </Box>
                                )}
                                <Box
                                    component="fieldset"
                                    disabled={readOnly}
                                    sx={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 3,
                                        border: "none",
                                        p: 0,
                                        m: 0,
                                        minWidth: 0,
                                    }}
                                >
                                    {(idx === 0
                                        ? mainSections
                                        : apSections
                                    ).map((section, sIdx) => (
                                        <Box key={sIdx}>
                                            {section.heading && (
                                                <>
                                                    {sIdx > 0 && (
                                                        <Divider
                                                            sx={{
                                                                mb: 2,
                                                                borderColor:
                                                                    p.line,
                                                            }}
                                                        />
                                                    )}
                                                    <Typography
                                                        sx={{
                                                            ...kickerSx,
                                                            mb: 1.5,
                                                        }}
                                                    >
                                                        {section.heading}
                                                    </Typography>
                                                </>
                                            )}
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: 2,
                                                }}
                                            >
                                                {section.fieldNames
                                                    .map((name) =>
                                                        fieldByName.get(name)
                                                    )
                                                    .filter(
                                                        (f): f is FieldMeta =>
                                                            !!f &&
                                                            (
                                                                allVisibleFields[
                                                                    idx
                                                                ] ??
                                                                allFieldNames
                                                            ).has(f.name)
                                                    )
                                                    .map((field) =>
                                                        renderField(
                                                            field,
                                                            state,
                                                            idx
                                                        )
                                                    )}
                                            </Box>
                                        </Box>
                                    ))}

                                    {(idx === 0
                                        ? archivedFields
                                        : archivedFields.filter(
                                              (f) => f.includeForAP
                                          )
                                    ).length > 0 && (
                                        <Box>
                                            <Divider
                                                sx={{
                                                    mb: 2,
                                                    borderColor: p.line,
                                                }}
                                            />
                                            <Typography
                                                sx={{
                                                    ...kickerSx,
                                                    mb: 1.5,
                                                }}
                                            >
                                                Zrušená pole
                                            </Typography>
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: 2,
                                                }}
                                            >
                                                {(idx === 0
                                                    ? archivedFields
                                                    : archivedFields.filter(
                                                          (f) => f.includeForAP
                                                      )
                                                ).map((field) =>
                                                    renderField(
                                                        field,
                                                        state,
                                                        idx
                                                    )
                                                )}
                                            </Box>
                                        </Box>
                                    )}
                                </Box>
                            </Paper>
                        );
                    })}
                </Grid>

                <Grid item xs={12} md={4}>
                    {!readOnly && (
                        <Box
                            sx={{
                                display: "flex",
                                gap: 1,
                                alignItems: "center",
                                justifyContent: "flex-end",
                                mb: 3,
                            }}
                        >
                            <Button
                                variant="contained"
                                startIcon={
                                    saving ? (
                                        <CircularProgress
                                            size={20}
                                            color="inherit"
                                        />
                                    ) : (
                                        <Save />
                                    )
                                }
                                onClick={handleSave}
                                disabled={isLoading}
                                sx={primaryBtnSx}
                            >
                                {saving ? "Ukládám..." : "Uložit změny"}
                            </Button>
                            <IconButton
                                onClick={() => setDeleteOpen(true)}
                                disabled={isLoading}
                                size="small"
                                aria-label="Smazat registraci"
                                sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: "8px",
                                    color: p.ink3,
                                    "&:hover": {
                                        color: p.negInk,
                                        backgroundColor: p.neg,
                                    },
                                }}
                            >
                                <Delete />
                            </IconButton>
                        </Box>
                    )}

                    <Paper elevation={0} sx={{ ...paneSx, p: 3, mb: 3 }}>
                        <Typography sx={{ ...kickerSx, mb: 2 }}>
                            Platba
                        </Typography>
                        <Box sx={{ mb: 2 }}>
                            <Box
                                sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "baseline",
                                }}
                            >
                                <Typography
                                    variant="body2"
                                    sx={{ color: p.ink2 }}
                                >
                                    Cena při registraci
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{ ...monoSx, color: p.ink }}
                                >
                                    {(order.totalPrice ?? 0).toLocaleString(
                                        "cs-CZ"
                                    )}{" "}
                                    Kč
                                </Typography>
                            </Box>
                            <Typography
                                variant="caption"
                                sx={{ color: p.ink3 }}
                            >
                                {formatDateTime(order.createdAt)}
                            </Typography>
                        </Box>
                        <SubmissionPricingSummary
                            pricingSummary={
                                currentPaid ? null : dynamicPricingSummary
                            }
                            variableSymbol={order.variableSymbol}
                            totalPrice={
                                currentPaid
                                    ? (order.totalPrice ?? 0)
                                    : computedPrice
                            }
                            priceDiff={
                                currentPaid
                                    ? 0
                                    : computedPrice - (order.totalPrice ?? 0)
                            }
                        />
                        {order.bankTransactions.length > 0 && (
                            <Box
                                sx={{
                                    mt: 2,
                                    pt: 2,
                                    borderTop: `1px solid ${p.line}`,
                                }}
                            >
                                <Typography
                                    variant="subtitle2"
                                    sx={{
                                        mb: 1,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 0.5,
                                        color: p.ink2,
                                    }}
                                >
                                    <AccountBalance fontSize="small" />
                                    Bankovní transakce
                                </Typography>
                                {order.bankTransactions.map((tx) => (
                                    <Box
                                        key={tx.id}
                                        sx={{
                                            mb: 1,
                                            p: 1.5,
                                            borderRadius: "10px",
                                            backgroundColor: p.surface2,
                                            border: `1px solid ${p.lineSoft}`,
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                mb: 0.5,
                                            }}
                                        >
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    ...monoSx,
                                                    fontWeight: 600,
                                                    color:
                                                        tx.amount < 0
                                                            ? p.negInk
                                                            : p.valueInk,
                                                }}
                                            >
                                                {tx.amount.toLocaleString(
                                                    "cs-CZ"
                                                )}{" "}
                                                {tx.currency}
                                            </Typography>
                                            {(() => {
                                                const txLabel =
                                                    {
                                                        MATCHED: "Spárováno",
                                                        PARTIAL_PAYMENT:
                                                            "Částečná platba",
                                                        OVERPAYMENT:
                                                            "Přeplatek",
                                                        ALREADY_PAID:
                                                            "Již zaplaceno",
                                                    }[tx.matchStatus] ??
                                                    tx.matchStatus;
                                                const txColor = (
                                                    {
                                                        MATCHED: {
                                                            bg: p.value,
                                                            fg: p.valueInk,
                                                        },
                                                        OVERPAYMENT: {
                                                            bg: p.value,
                                                            fg: p.valueInk,
                                                        },
                                                        PARTIAL_PAYMENT: {
                                                            bg: p.warnSoft,
                                                            fg: p.warnInk,
                                                        },
                                                        ALREADY_PAID: {
                                                            bg: p.field,
                                                            fg: p.fieldInk,
                                                        },
                                                    } as Record<
                                                        string,
                                                        {
                                                            bg: string;
                                                            fg: string;
                                                        }
                                                    >
                                                )[tx.matchStatus] ?? {
                                                    bg: p.surface3,
                                                    fg: p.ink2,
                                                };
                                                return (
                                                    <StatusBadge
                                                        label={txLabel}
                                                        bg={txColor.bg}
                                                        fg={txColor.fg}
                                                    />
                                                );
                                            })()}
                                        </Box>
                                        <Typography
                                            variant="caption"
                                            component="div"
                                            sx={{ color: p.ink3 }}
                                        >
                                            {formatDateTime(tx.date)}
                                            {tx.counterpartName &&
                                                ` · ${tx.counterpartName}`}
                                            {tx.counterpartAccount &&
                                                !tx.counterpartName &&
                                                ` · ${tx.counterpartAccount}`}
                                        </Typography>
                                        {tx.variableSymbol && (
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    ...monoSx,
                                                    color: p.ink2,
                                                }}
                                            >
                                                VS {tx.variableSymbol}
                                            </Typography>
                                        )}
                                    </Box>
                                ))}
                                {(() => {
                                    const totalPaid =
                                        order.bankTransactions.reduce(
                                            (sum, t) => sum + t.amount,
                                            0
                                        );
                                    const price = order.totalPrice ?? 0;
                                    const diff = totalPaid - price;
                                    const chipLabel =
                                        diff > 0
                                            ? `+${diff.toLocaleString("cs-CZ")} Kč`
                                            : diff === 0
                                              ? "Uhrazeno"
                                              : `${diff.toLocaleString("cs-CZ")} Kč`;
                                    return (
                                        <Box
                                            sx={{
                                                mt: 1,
                                                pt: 1,
                                                borderTop: `1px solid ${p.line}`,
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                            }}
                                        >
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 600,
                                                    color: p.ink,
                                                }}
                                            >
                                                Přijato:{" "}
                                                {totalPaid.toLocaleString(
                                                    "cs-CZ"
                                                )}{" "}
                                                /{" "}
                                                {price.toLocaleString("cs-CZ")}{" "}
                                                Kč
                                            </Typography>
                                            <StatusBadge
                                                label={chipLabel}
                                                bg={
                                                    diff >= 0
                                                        ? p.value
                                                        : p.warnSoft
                                                }
                                                fg={
                                                    diff >= 0
                                                        ? p.valueInk
                                                        : p.warnInk
                                                }
                                            />
                                        </Box>
                                    );
                                })()}
                            </Box>
                        )}
                        {!readOnly && (
                            <Box
                                sx={{
                                    display: "flex",
                                    gap: 1.5,
                                    alignItems: "center",
                                    mt: 2,
                                    pt: 2,
                                    borderTop: `1px solid ${p.line}`,
                                }}
                            >
                                <FormControl
                                    size="small"
                                    sx={{ flex: 1, ...builderFieldSx }}
                                >
                                    <InputLabel>Stav</InputLabel>
                                    <Select
                                        value={currentStatus}
                                        onChange={(e) =>
                                            handleStatusChange(
                                                e.target
                                                    .value as RegistrationStatus
                                            )
                                        }
                                        label="Stav"
                                        disabled={isLoading}
                                    >
                                        {STATUS_OPTIONS.map((opt) => (
                                            <MenuItem
                                                key={opt.value}
                                                value={opt.value}
                                            >
                                                {opt.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={currentPaid}
                                            onChange={handlePaymentToggle}
                                            disabled={isLoading}
                                            size="small"
                                            sx={{
                                                "& .MuiSwitch-switchBase.Mui-checked":
                                                    {
                                                        color: p.surface,
                                                    },
                                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                                                    {
                                                        backgroundColor:
                                                            p.indigo,
                                                        opacity: 1,
                                                    },
                                            }}
                                        />
                                    }
                                    label={
                                        currentPaid
                                            ? "Zaplaceno"
                                            : "Nezaplaceno"
                                    }
                                    sx={{
                                        mr: 0,
                                        "& .MuiFormControlLabel-label": {
                                            color: p.ink2,
                                        },
                                    }}
                                />
                            </Box>
                        )}
                    </Paper>

                    {!readOnly && (
                        <Paper elevation={0} sx={{ ...paneSx, p: 3, mb: 3 }}>
                            <Typography sx={{ ...kickerSx, mb: 2 }}>
                                Potvrzovací email
                            </Typography>
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                }}
                            >
                                {order.emailSent ? (
                                    <StatusBadge
                                        label={`Odesláno${order.emailSentAt ? ` ${formatDateTime(order.emailSentAt)}` : ""}`}
                                        bg={p.value}
                                        fg={p.valueInk}
                                    />
                                ) : (
                                    <StatusBadge
                                        label="Neodesláno"
                                        bg={p.surface3}
                                        fg={p.ink2}
                                    />
                                )}
                                <Button
                                    size="small"
                                    onClick={handleResendEmail}
                                    disabled={emailSending}
                                    sx={ghostBtnSx}
                                >
                                    {emailSending
                                        ? "Odesílám..."
                                        : order.emailSent
                                          ? "Znovu odeslat"
                                          : "Odeslat email"}
                                </Button>
                            </Box>
                        </Paper>
                    )}

                    {!readOnly && (
                        <Paper elevation={0} sx={{ ...paneSx, p: 3 }}>
                            <Typography sx={{ ...kickerSx, mb: 2 }}>
                                Poznámka admina
                            </Typography>
                            <AdminNoteDetail
                                submissionId={legacyId!}
                                adminNote={order.adminNote}
                            />
                        </Paper>
                    )}
                </Grid>
            </Grid>

            <Dialog
                open={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                PaperProps={dialogPaperProps}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>
                    Smazat registraci?
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Tato akce je nevratná. Registrace bude trvale
                        odstraněna.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setDeleteOpen(false)}
                        sx={ghostBtnSx}
                    >
                        Zrušit
                    </Button>
                    <Button
                        onClick={handleDelete}
                        variant="contained"
                        disableElevation
                        sx={softDangerBtnSx}
                    >
                        Smazat
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={removePersonIdx !== null}
                onClose={() => setRemovePersonIdx(null)}
                PaperProps={dialogPaperProps}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>
                    Odebrat osobu?
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Data osoby č. {(removePersonIdx ?? 0) + 1} budou
                        ztracena. Změna se projeví až po uložení.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setRemovePersonIdx(null)}
                        sx={ghostBtnSx}
                    >
                        Zrušit
                    </Button>
                    <Button
                        onClick={() => {
                            if (removePersonIdx !== null) {
                                handleRemovePerson(removePersonIdx);
                            }
                            setRemovePersonIdx(null);
                        }}
                        variant="contained"
                        disableElevation
                        sx={softDangerBtnSx}
                    >
                        Odebrat
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
