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
    Chip,
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
import { Save, Delete, Person, AccountBalance, HowToReg, PersonOutline } from "@mui/icons-material";
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

import type {
    FieldMeta,
    PersonState,
    SubmissionDetailProps,
} from "./types";
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

export function SubmissionDetail({
    order,
    yearId,
    readOnly,
}: SubmissionDetailProps) {
    const router = useRouter();
    const fields = useMemo(
        () => buildFields(order),
        [order],
    );
    const fieldByName = useMemo(
        () => new Map(fields.map((f) => [f.name, f])),
        [fields],
    );
    const pricingDefById = useMemo(
        () =>
            new Map(
                order.pricingDefinitions.map((d) => [
                    d.id,
                    d,
                ]),
            ),
        [order.pricingDefinitions],
    );

    const [initialStates] = useState<PersonState[]>(() =>
        order.people.map(buildPersonState),
    );
    const [personStates, setPersonStates] = useState<
        PersonState[]
    >(() => order.people.map(buildPersonState));
    const [attendance, setAttendance] = useState<
        Record<string, boolean>
    >(() =>
        Object.fromEntries(
            order.people.map((p) => [
                p.id,
                p.isAttending,
            ]),
        ),
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(
        null,
    );
    const [success, setSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [currentStatus, setCurrentStatus] = useState(
        order.status,
    );
    const [currentPaid, setCurrentPaid] = useState(
        order.isPaid,
    );
    const [actionLoading, setActionLoading] =
        useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [removePersonIdx, setRemovePersonIdx] =
        useState<number | null>(null);
    const [emailSending, setEmailSending] =
        useState(false);

    const isLoading = saving || actionLoading;

    const currentTierId = useMemo(
        () =>
            getCurrentTierId(
                order.priceTiers,
                order.paidAt
                    ? new Date(order.paidAt)
                    : undefined,
            ),
        [order.priceTiers, order.paidAt],
    );
    const apFields = fields.filter(
        (f) => f.includeForAP,
    );

    const formData = useMemo(
        (): RegistrationFormData | null => {
            if (!order.formLayout) return null;
            return migrateFormData(order.formLayout);
        },
        [order.formLayout],
    );

    const mainValues = useMemo(() => {
        const state = personStates[0];
        if (!state)
            return {} as Record<
                string,
                string | number | boolean
            >;
        return personStateToLegacyData(
            state,
            fields,
        ) as Record<string, string | number | boolean>;
    }, [personStates, fields]);

    const { visibleFields } = useConditionalFields(
        formData ?? {
            fields: [],
            conditions: [],
            pricingDefinitions: [],
            capacityLimits: [],
            showOptionCounts: [],
            priceTiers: [],
        },
        mainValues,
    );

    const allFieldNames = useMemo(
        () => new Set(fields.map((f) => f.name)),
        [fields],
    );
    const apFieldNames = useMemo(
        () => new Set(apFields.map((f) => f.name)),
        [apFields],
    );

    const idToName = useMemo(() => {
        if (!formData) return null;
        const legacyFields = getAllFields(formData.fields);
        return new Map(
            legacyFields
                .filter(
                    (
                        f,
                    ): f is LegacyFormField & {
                        name: string;
                    } => "name" in f,
                )
                .map((f) => [
                    f.id,
                    (f as { name: string }).name,
                ]),
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
        [visibleFields, idToName, allFieldNames],
    );

    const apVisibleFieldNames = useMemo(() => {
        if (!formData) return personStates.map(() => apFieldNames);
        return personStates.slice(1).map((state) => {
            const apData = personStateToLegacyData(
                state,
                apFields,
            );
            const merged = {
                ...mainValues,
                ...apData,
            } as Record<string, string | number | boolean>;
            const ids = evaluateAPVisibleFields(
                formData,
                merged,
            );
            return idsToNames(ids);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData, personStates, mainValues, apFields, idToName, apFieldNames]);

    const allVisibleFields = useMemo(
        () => [
            visibleFieldNames,
            ...apVisibleFieldNames,
        ],
        [visibleFieldNames, apVisibleFieldNames],
    );

    const computedPrice = useMemo(
        () =>
            computeTotal(
                personStates,
                fields,
                pricingDefById,
                currentTierId,
                allVisibleFields,
            ),
        [
            personStates,
            fields,
            pricingDefById,
            currentTierId,
            allVisibleFields,
        ],
    );
    const originalPrice = useMemo(
        () =>
            computeTotal(
                initialStates,
                fields,
                pricingDefById,
                currentTierId,
                allVisibleFields,
            ),
        [
            initialStates,
            fields,
            pricingDefById,
            currentTierId,
            allVisibleFields,
        ],
    );

    const mainSections = extractSections(
        order.formLayout,
        allFieldNames,
    );
    const apSections = extractSections(
        order.formLayout,
        apFieldNames,
    );
    const layoutFieldNames = new Set(
        mainSections.flatMap((s) => s.fieldNames),
    );
    const archivedFields = fields.filter(
        (f) =>
            !f.isActive ||
            !layoutFieldNames.has(f.name),
    );

    // ---- State updaters ----

    const updateValue = (
        personIdx: number,
        fieldName: string,
        value: string,
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
        qty: number,
    ) => {
        setPersonStates((prev) => {
            const updated = [...prev];
            const fieldQty = {
                ...(updated[personIdx].quantities[
                    fieldName
                ] ?? {}),
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
        selected: string[],
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
            const next = prev.filter(
                (_, i) => i !== personIdx,
            );
            setActiveTab((tab) =>
                Math.min(tab, next.length - 1),
            );
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

        const apStates = personStates.slice(1);
        if (apStates.length > 0) {
            mainData.additionalPeople = apStates.map(
                (s) =>
                    personStateToLegacyData(
                        s,
                        apFields,
                    ),
            );
        }

        const result = await updateSubmissionData(
            legacyId!,
            mainData,
        );

        if (result.error) {
            setError(result.error);
            setSaving(false);
            return;
        }

        const survivingPeople = personStates
            .map((s) =>
                order.people.find(
                    (p) =>
                        p.personIndex ===
                        s.personIndex,
                ),
            )
            .filter(
                (p): p is NonNullable<typeof p> =>
                    !!p,
            );
        const attendanceUpdates = survivingPeople
            .filter(
                (p) =>
                    attendance[p.id] !== p.isAttending,
            )
            .map((p) =>
                togglePersonIsAttending(
                    p.id,
                    attendance[p.id],
                ),
            );
        if (attendanceUpdates.length > 0) {
            const results =
                await Promise.all(attendanceUpdates);
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
    };

    const handleStatusChange = async (
        newStatus: RegistrationStatus,
    ) => {
        if (!legacyId) return;
        setActionLoading(true);
        setError(null);
        const result = await updateSubmissionStatus(
            legacyId!,
            newStatus,
        );
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
        const result = await toggleSubmissionPayment(
            legacyId!,
            newPaid,
        );
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
        const result = await deleteSubmission(
            legacyId!,
        );
        if (result.error) {
            setError(result.error);
            setActionLoading(false);
        } else {
            router.push(
                `/admin/rocniky/${yearId}/registrace/prihlasky`,
            );
        }
    };

    const handleResendEmail = async () => {
        if (!legacyId) return;
        setEmailSending(true);
        setError(null);
        const result = await resendConfirmationEmail(
            legacyId!,
        );
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
        personIdx: number,
    ) => (
        <FieldRenderer
            key={field.id}
            field={field}
            value={state.values[field.name] ?? ""}
            quantities={state.quantities[field.name]}
            multiSelected={
                state.multiSelects[field.name]
            }
            pricingDef={
                field.pricingDefinitionId
                    ? pricingDefById.get(
                          field.pricingDefinitionId,
                      ) ?? undefined
                    : undefined
            }
            onChange={(v) =>
                updateValue(personIdx, field.name, v)
            }
            onQuantityChange={(optId, qty) =>
                updateQuantity(
                    personIdx,
                    field.name,
                    optId,
                    qty,
                )
            }
            onMultiSelectChange={(sel) =>
                updateMultiSelect(
                    personIdx,
                    field.name,
                    sel,
                )
            }
            disabled={readOnly || !field.isActive}
        />
    );

    const personLabel = (idx: number) =>
        idx === 0
            ? "Hlavní osoba"
            : `Osoba č. ${idx + 1}`;

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
                        <Chip
                            label="TEST"
                            color="warning"
                            size="small"
                            variant="outlined"
                            sx={{
                                fontWeight: 700,
                                mb: 2,
                            }}
                        />
                    )}

                    <Tabs
                            value={activeTab}
                            onChange={(_, v: number) =>
                                setActiveTab(v)
                            }
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{
                                borderBottom: 1,
                                borderColor: "divider",
                                mb: 2,
                            }}
                        >
                            {personStates.map(
                                (_, idx) => (
                                    <Tab
                                        key={idx}
                                        icon={
                                            <Person fontSize="small" />
                                        }
                                        iconPosition="start"
                                        label={
                                            <Box
                                                sx={{
                                                    display:
                                                        "flex",
                                                    alignItems:
                                                        "center",
                                                    gap: 1,
                                                }}
                                            >
                                                {personLabel(
                                                    idx,
                                                )}
                                                {idx >
                                                    0 &&
                                                    !readOnly && (
                                                        <Box
                                                            component="span"
                                                            onClick={(
                                                                e: React.MouseEvent,
                                                            ) => {
                                                                e.stopPropagation();
                                                                setRemovePersonIdx(
                                                                    idx,
                                                                );
                                                            }}
                                                            sx={{
                                                                ml: 0.5,
                                                                display:
                                                                    "inline-flex",
                                                                cursor: "pointer",
                                                                color: "error.main",
                                                                "&:hover":
                                                                    {
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
                                ),
                            )}
                        </Tabs>

                    {personStates.map((state, idx) => {
                        const person =
                            order.people.find(
                                (p) =>
                                    p.personIndex ===
                                    state.personIndex,
                            );
                        const personAttending =
                            person
                                ? attendance[person.id] ??
                                  false
                                : false;
                        return (
                        <Paper
                            key={idx}
                            role="tabpanel"
                            hidden={
                                activeTab !== idx
                            }
                            sx={{ p: 3 }}
                        >
                            {person && !readOnly && (
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems:
                                            "center",
                                        mb: 2,
                                    }}
                                >
                                    <Button
                                        variant={
                                            personAttending
                                                ? "contained"
                                                : "outlined"
                                        }
                                        size="small"
                                        color={
                                            personAttending
                                                ? "success"
                                                : "inherit"
                                        }
                                        startIcon={
                                            personAttending ? (
                                                <HowToReg fontSize="small" />
                                            ) : (
                                                <PersonOutline fontSize="small" />
                                            )
                                        }
                                        onClick={() =>
                                            setAttendance(
                                                (prev) => ({
                                                    ...prev,
                                                    [person.id]:
                                                        !personAttending,
                                                }),
                                            )
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
                                    flexDirection:
                                        "column",
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
                                ).map(
                                    (section, sIdx) => (
                                        <Box key={sIdx}>
                                            {section.heading && (
                                                <>
                                                    {sIdx >
                                                        0 && (
                                                        <Divider
                                                            sx={{
                                                                mb: 2,
                                                            }}
                                                        />
                                                    )}
                                                    <Typography
                                                        variant="subtitle1"
                                                        fontWeight={
                                                            600
                                                        }
                                                        sx={{
                                                            mb: 1.5,
                                                        }}
                                                    >
                                                        {
                                                            section.heading
                                                        }
                                                    </Typography>
                                                </>
                                            )}
                                            <Box
                                                sx={{
                                                    display:
                                                        "flex",
                                                    flexDirection:
                                                        "column",
                                                    gap: 2,
                                                }}
                                            >
                                                {section.fieldNames
                                                    .map(
                                                        (
                                                            name,
                                                        ) =>
                                                            fieldByName.get(
                                                                name,
                                                            ),
                                                    )
                                                    .filter(
                                                        (
                                                            f,
                                                        ): f is FieldMeta =>
                                                            !!f &&
                                                            (
                                                                allVisibleFields[
                                                                    idx
                                                                ] ??
                                                                allFieldNames
                                                            ).has(
                                                                f.name,
                                                            ),
                                                    )
                                                    .map(
                                                        (
                                                            field,
                                                        ) =>
                                                            renderField(
                                                                field,
                                                                state,
                                                                idx,
                                                            ),
                                                    )}
                                            </Box>
                                        </Box>
                                    ),
                                )}

                                {(idx === 0
                                    ? archivedFields
                                    : archivedFields.filter(
                                          (f) =>
                                              f.includeForAP,
                                      )
                                ).length > 0 && (
                                    <Box>
                                        <Divider
                                            sx={{
                                                mb: 2,
                                            }}
                                        />
                                        <Typography
                                            variant="subtitle1"
                                            fontWeight={
                                                600
                                            }
                                            color="text.secondary"
                                            sx={{
                                                mb: 1.5,
                                            }}
                                        >
                                            Zrušená pole
                                        </Typography>
                                        <Box
                                            sx={{
                                                display:
                                                    "flex",
                                                flexDirection:
                                                    "column",
                                                gap: 2,
                                            }}
                                        >
                                            {(idx === 0
                                                ? archivedFields
                                                : archivedFields.filter(
                                                      (
                                                          f,
                                                      ) =>
                                                          f.includeForAP,
                                                  )
                                            ).map(
                                                (
                                                    field,
                                                ) =>
                                                    renderField(
                                                        field,
                                                        state,
                                                        idx,
                                                    ),
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
                                justifyContent:
                                    "flex-end",
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
                            >
                                {saving
                                    ? "Ukládám..."
                                    : "Uložit změny"}
                            </Button>
                            <IconButton
                                color="error"
                                onClick={() =>
                                    setDeleteOpen(true)
                                }
                                disabled={isLoading}
                                size="small"
                            >
                                <Delete />
                            </IconButton>
                        </Box>
                    )}

                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography
                            variant="h6"
                            sx={{ mb: 2 }}
                        >
                            Platba
                        </Typography>
                        <Box sx={{ mb: 2 }}>
                            <Box
                                sx={{
                                    display: "flex",
                                    justifyContent:
                                        "space-between",
                                    alignItems:
                                        "baseline",
                                }}
                            >
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    Cena při registraci
                                </Typography>
                                <Typography
                                    variant="body2"
                                >
                                    {(
                                        order.totalPrice ??
                                        0
                                    ).toLocaleString(
                                        "cs-CZ",
                                    )}{" "}
                                    Kč
                                </Typography>
                            </Box>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                            >
                                {formatDateTime(
                                    order.createdAt,
                                )}
                            </Typography>
                            {computedPrice !==
                                (order.totalPrice ??
                                    0) && (
                                <Box
                                    sx={{
                                        display: "flex",
                                        justifyContent:
                                            "space-between",
                                        alignItems:
                                            "baseline",
                                        mt: 1,
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        Aktuální cena
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontWeight: 600,
                                        }}
                                    >
                                        {computedPrice.toLocaleString(
                                            "cs-CZ",
                                        )}{" "}
                                        Kč
                                        <Typography
                                            component="span"
                                            variant="caption"
                                            color={
                                                computedPrice >
                                                (order.totalPrice ??
                                                    0)
                                                    ? "warning.main"
                                                    : "success.main"
                                            }
                                            sx={{
                                                ml: 0.5,
                                            }}
                                        >
                                            (
                                            {computedPrice -
                                                (order.totalPrice ??
                                                    0) >
                                            0
                                                ? "+"
                                                : ""}
                                            {(
                                                computedPrice -
                                                (order.totalPrice ??
                                                    0)
                                            ).toLocaleString(
                                                "cs-CZ",
                                            )}
                                            )
                                        </Typography>
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                        <SubmissionPricingSummary
                            pricingSummary={
                                order.pricingSummary as PricingSummaryData | null
                            }
                            variableSymbol={
                                order.variableSymbol
                            }
                            totalPrice={computedPrice}
                            priceDiff={
                                computedPrice -
                                originalPrice
                            }
                        />
                        {order.bankTransactions.length >
                            0 && (
                            <Box
                                sx={{
                                    mt: 2,
                                    pt: 2,
                                    borderTop: 1,
                                    borderColor:
                                        "divider",
                                }}
                            >
                                <Typography
                                    variant="subtitle2"
                                    sx={{
                                        mb: 1,
                                        display: "flex",
                                        alignItems:
                                            "center",
                                        gap: 0.5,
                                    }}
                                >
                                    <AccountBalance
                                        fontSize="small"
                                    />
                                    Bankovní transakce
                                </Typography>
                                {order.bankTransactions.map(
                                    (tx) => (
                                        <Box
                                            key={tx.id}
                                            sx={{
                                                mb: 1,
                                                p: 1.5,
                                                borderRadius: 1,
                                                backgroundColor:
                                                    "action.hover",
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    display:
                                                        "flex",
                                                    justifyContent:
                                                        "space-between",
                                                    alignItems:
                                                        "center",
                                                    mb: 0.5,
                                                }}
                                            >
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontWeight: 600,
                                                        color:
                                                            tx.amount >
                                                            0
                                                                ? "success.main"
                                                                : "text.primary",
                                                    }}
                                                >
                                                    {tx.amount.toLocaleString(
                                                        "cs-CZ",
                                                    )}{" "}
                                                    {
                                                        tx.currency
                                                    }
                                                </Typography>
                                                <Chip
                                                    label={
                                                        {
                                                            MATCHED:
                                                                "Spárováno",
                                                            PARTIAL_PAYMENT:
                                                                "Částečná platba",
                                                            OVERPAYMENT:
                                                                "Přeplatek",
                                                            ALREADY_PAID:
                                                                "Již zaplaceno",
                                                        }[
                                                            tx
                                                                .matchStatus
                                                        ] ??
                                                        tx.matchStatus
                                                    }
                                                    color={
                                                        (
                                                            {
                                                                MATCHED:
                                                                    "success",
                                                                PARTIAL_PAYMENT:
                                                                    "warning",
                                                                OVERPAYMENT:
                                                                    "success",
                                                                ALREADY_PAID:
                                                                    "info",
                                                            } as Record<
                                                                string,
                                                                | "success"
                                                                | "warning"
                                                                | "info"
                                                            >
                                                        )[
                                                            tx
                                                                .matchStatus
                                                        ] ??
                                                        "default"
                                                    }
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </Box>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                component="div"
                                            >
                                                {formatDateTime(
                                                    tx.date,
                                                )}
                                                {tx.counterpartName &&
                                                    ` · ${tx.counterpartName}`}
                                                {tx.counterpartAccount &&
                                                    !tx.counterpartName &&
                                                    ` · ${tx.counterpartAccount}`}
                                            </Typography>
                                            {tx.variableSymbol && (
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{
                                                        fontFamily:
                                                            "monospace",
                                                    }}
                                                >
                                                    VS{" "}
                                                    {
                                                        tx.variableSymbol
                                                    }
                                                </Typography>
                                            )}
                                        </Box>
                                    ),
                                )}
                                {(() => {
                                    const totalPaid =
                                        order.bankTransactions.reduce(
                                            (sum, t) =>
                                                sum +
                                                t.amount,
                                            0,
                                        );
                                    const price =
                                        order.totalPrice ??
                                        0;
                                    const diff =
                                        totalPaid -
                                        price;
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
                                                borderTop: 1,
                                                borderColor:
                                                    "divider",
                                                display:
                                                    "flex",
                                                justifyContent:
                                                    "space-between",
                                                alignItems:
                                                    "center",
                                            }}
                                        >
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 600,
                                                }}
                                            >
                                                Přijato:{" "}
                                                {totalPaid.toLocaleString(
                                                    "cs-CZ",
                                                )}{" "}
                                                /{" "}
                                                {price.toLocaleString(
                                                    "cs-CZ",
                                                )}{" "}
                                                Kč
                                            </Typography>
                                            <Chip
                                                label={
                                                    chipLabel
                                                }
                                                color={
                                                    diff >=
                                                    0
                                                        ? "success"
                                                        : "warning"
                                                }
                                                size="small"
                                                variant="outlined"
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
                                    alignItems:
                                        "center",
                                    mt: 2,
                                    pt: 2,
                                    borderTop: 1,
                                    borderColor:
                                        "divider",
                                }}
                            >
                                <FormControl
                                    size="small"
                                    sx={{ flex: 1 }}
                                >
                                    <InputLabel>
                                        Stav
                                    </InputLabel>
                                    <Select
                                        value={
                                            currentStatus
                                        }
                                        onChange={(e) =>
                                            handleStatusChange(
                                                e.target
                                                    .value as RegistrationStatus,
                                            )
                                        }
                                        label="Stav"
                                        disabled={
                                            isLoading
                                        }
                                    >
                                        {STATUS_OPTIONS.map(
                                            (opt) => (
                                                <MenuItem
                                                    key={
                                                        opt.value
                                                    }
                                                    value={
                                                        opt.value
                                                    }
                                                >
                                                    {
                                                        opt.label
                                                    }
                                                </MenuItem>
                                            ),
                                        )}
                                    </Select>
                                </FormControl>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={
                                                currentPaid
                                            }
                                            onChange={
                                                handlePaymentToggle
                                            }
                                            disabled={
                                                isLoading
                                            }
                                            color="success"
                                            size="small"
                                        />
                                    }
                                    label={
                                        currentPaid
                                            ? "Zaplaceno"
                                            : "Nezaplaceno"
                                    }
                                    sx={{ mr: 0 }}
                                />
                            </Box>
                        )}
                    </Paper>

                    {!readOnly && (
                        <Paper sx={{ p: 3, mb: 3 }}>
                            <Typography
                                variant="h6"
                                sx={{ mb: 2 }}
                            >
                                Potvrzovací email
                            </Typography>
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems:
                                        "center",
                                    gap: 1,
                                }}
                            >
                                {order.emailSent ? (
                                    <Chip
                                        label={`Odesláno${order.emailSentAt ? ` ${formatDateTime(order.emailSentAt)}` : ""}`}
                                        color="success"
                                        size="small"
                                        variant="outlined"
                                    />
                                ) : (
                                    <Chip
                                        label="Neodesláno"
                                        size="small"
                                        variant="outlined"
                                    />
                                )}
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={
                                        handleResendEmail
                                    }
                                    disabled={
                                        emailSending
                                    }
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
                        <Paper sx={{ p: 3 }}>
                            <Typography
                                variant="h6"
                                sx={{ mb: 2 }}
                            >
                                Poznámka admina
                            </Typography>
                            <AdminNoteDetail
                                submissionId={
                                    legacyId!
                                }
                                adminNote={
                                    order.adminNote
                                }
                            />
                        </Paper>
                    )}
                </Grid>
            </Grid>

            <Dialog
                open={deleteOpen}
                onClose={() => setDeleteOpen(false)}
            >
                <DialogTitle>
                    Smazat registraci?
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Tato akce je nevratná. Registrace
                        bude trvale odstraněna.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() =>
                            setDeleteOpen(false)
                        }
                    >
                        Zrušit
                    </Button>
                    <Button
                        onClick={handleDelete}
                        color="error"
                        variant="contained"
                    >
                        Smazat
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={removePersonIdx !== null}
                onClose={() =>
                    setRemovePersonIdx(null)
                }
            >
                <DialogTitle>
                    Odebrat osobu?
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Data osoby č.{" "}
                        {(removePersonIdx ?? 0) + 1}{" "}
                        budou ztracena. Změna se projeví
                        až po uložení.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() =>
                            setRemovePersonIdx(null)
                        }
                    >
                        Zrušit
                    </Button>
                    <Button
                        onClick={() => {
                            if (
                                removePersonIdx !== null
                            ) {
                                handleRemovePerson(
                                    removePersonIdx,
                                );
                            }
                            setRemovePersonIdx(null);
                        }}
                        color="error"
                        variant="contained"
                    >
                        Odebrat
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
