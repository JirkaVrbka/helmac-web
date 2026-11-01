"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Tab,
    Tabs,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import type {
    ConditionalEmailInfo,
    FieldExternalUsage,
} from "@/lib/utils/condition-validation";
import {
    getFieldExternalUsages,
    getFieldIdsUsedInConditions,
} from "@/lib/utils/condition-validation";
import {
    deleteRegistrationForm,
    saveRegistrationForm,
} from "@/lib/actions/registration-forms";
import { saveFormPreview } from "@/lib/actions/form-preview";
import type {
    FieldType,
    FormCondition,
    FormField,
    InputField,
    RegistrationFormData,
} from "@/lib/types/registration-form";
import { getAllFields, isInputField } from "@/lib/types/registration-form";
import { FieldEditor } from "./field-editor";
import { FieldPalette } from "./field-palette";
import { FieldTypeSelector } from "./field-type-selector";
import { ConditionEditor } from "./condition-editor";
import { PricingEditor } from "./pricing-editor";
import { FormBuilderCanvas } from "./form-builder-canvas";
import { FormBuilderToolbar } from "./form-builder-toolbar";
import { DragOverlayContent } from "./drag-overlay";
import {
    DeleteFormDialog,
    DeletionBlockDialog,
    type DeletionBlockInfo,
} from "./form-builder-dialogs";
import { useFormBuilderState } from "./use-form-builder-state";
import { useFormBuilderDnd } from "./use-form-builder-dnd";
import { useFormValidation } from "./use-form-validation";
import { makeBlankField } from "./form-builder-helpers";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface FormBuilderProps {
    yearId: string;
    initialFormData: RegistrationFormData;
    emailFieldNames?: string[];
    conditionalEmails?: ConditionalEmailInfo[];
    /** Hide editing affordances and disable drag/edit (editor role). */
    readOnly?: boolean;
}

export function FormBuilder({
    yearId,
    initialFormData,
    emailFieldNames = [],
    conditionalEmails = [],
    readOnly = false,
}: FormBuilderProps) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const { state, dispatch, getFormData } =
        useFormBuilderState(initialFormData);

    const [editingField, setEditingField] = useState<FormField | null>(null);
    const [typeSelectorOpen, setTypeSelectorOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deletionBlock, setDeletionBlock] =
        useState<DeletionBlockInfo | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [previewSaving, setPreviewSaving] = useState(false);
    const [previewToken, setPreviewToken] = useState<string | null>(null);
    const [tab, setTab] = useState<0 | 1 | 2>(0);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const emailNameSet = useMemo(
        () => new Set(emailFieldNames),
        [emailFieldNames]
    );
    const nestedFormData = useMemo(() => getFormData(), [getFormData]);
    const allFields = useMemo(
        () => getAllFields(nestedFormData.fields),
        [nestedFormData]
    );
    const usedFieldIds = useMemo(
        () => getFieldIdsUsedInConditions(state.conditions),
        [state.conditions]
    );
    const fieldExternalUsages = useMemo(() => {
        const map = new Map<string, FieldExternalUsage[]>();
        for (const f of allFields) {
            if (!isInputField(f)) continue;
            const usages = getFieldExternalUsages(
                f.id,
                f.name,
                state.capacityLimits,
                state.showOptionCounts,
                emailNameSet,
                state.infoStatsConfig
            );
            if (usages.length > 0) map.set(f.id, usages);
        }
        return map;
    }, [
        allFields,
        state.capacityLimits,
        state.showOptionCounts,
        emailNameSet,
        state.infoStatsConfig,
    ]);

    const addBlankField = (
        type: FieldType,
        pricingId?: string,
        pricingDefName?: string
    ) => {
        const field = makeBlankField(type, pricingId, pricingDefName);
        dispatch({
            type: "addElement",
            element: { kind: "field", data: { field, parentBlockId: null } },
        });
        setEditingField(field);
    };

    const addBlock = useCallback(
        (conditionId: string) =>
            dispatch({
                type: "addElement",
                element: {
                    kind: "block",
                    data: {
                        type: "condition",
                        id: crypto.randomUUID(),
                        conditionId,
                    },
                },
            }),
        [dispatch]
    );

    const handleDeleteBlock = useCallback(
        (blockId: string) => dispatch({ type: "removeBlock", blockId }),
        [dispatch]
    );

    const handlePatchField = useCallback(
        (fieldId: string, patch: Partial<InputField>) =>
            dispatch({ type: "patchField", fieldId, patch }),
        [dispatch]
    );

    const dndCallbacks = useMemo(
        () => ({
            moveElement: (id: string, parent: string | null, idx: number) =>
                dispatch({
                    type: "moveElement",
                    id,
                    toParentBlockId: parent,
                    toIndex: idx,
                }),
            insertField: (
                field: FormField,
                parent: string | null,
                atIndex: number
            ) => {
                dispatch({
                    type: "addElement",
                    element: {
                        kind: "field",
                        data: { field, parentBlockId: parent },
                    },
                });
                dispatch({
                    type: "moveElement",
                    id: field.id,
                    toParentBlockId: parent,
                    toIndex: atIndex,
                });
            },
            insertBlock: (conditionId: string, atIndex: number) => {
                const blockId = crypto.randomUUID();
                dispatch({
                    type: "addElement",
                    element: {
                        kind: "block",
                        data: {
                            type: "condition",
                            id: blockId,
                            conditionId,
                        },
                    },
                });
                dispatch({
                    type: "moveElement",
                    id: blockId,
                    toParentBlockId: null,
                    toIndex: atIndex,
                });
            },
            onPaletteFieldCreated: setEditingField,
            pricingDefinitions: state.pricingDefinitions,
        }),
        [dispatch, state.pricingDefinitions]
    );

    const {
        activeId,
        sensors,
        collisionDetection,
        onDragStart,
        onDragOver,
        onDragEnd,
        onDragCancel,
    } = useFormBuilderDnd(state.elements, dndCallbacks);

    const validationCtx = useMemo(
        () => ({
            conditions: state.conditions,
            pricingDefinitions: state.pricingDefinitions,
            capacityLimits: state.capacityLimits,
            showOptionCounts: state.showOptionCounts,
            emailFieldNames: emailNameSet,
            infoStatsConfig: state.infoStatsConfig,
            conditionalEmails,
        }),
        [
            state.conditions,
            state.pricingDefinitions,
            state.capacityLimits,
            state.showOptionCounts,
            emailNameSet,
            state.infoStatsConfig,
            conditionalEmails,
        ]
    );
    const { checkDelete, checkSave } = useFormValidation(validationCtx);

    const handleDeleteField = (fieldId: string) => {
        const blocked = checkDelete(allFields.find((f) => f.id === fieldId));
        if (blocked) {
            setDeletionBlock(blocked);
            return;
        }
        dispatch({ type: "removeField", fieldId });
    };

    const handleSaveField = (updated: FormField) => {
        const blocked = checkSave(editingField, updated);
        if (blocked) {
            setDeletionBlock(blocked);
            return;
        }
        dispatch({ type: "updateField", field: updated });
        setEditingField(null);
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSuccess(false);
        const result = await saveRegistrationForm(yearId, getFormData());
        if (result.error) setError(result.error);
        else setSuccess(true);
        setSaving(false);
    };

    useEffect(() => {
        if (!success) return;
        const t = setTimeout(() => setSuccess(false), 3000);
        return () => clearTimeout(t);
    }, [success]);

    const handleDelete = async () => {
        setDeleting(true);
        setDeleteConfirmOpen(false);
        const result = await deleteRegistrationForm(yearId);
        if (result.error) {
            setError(
                typeof result.error === "string"
                    ? result.error
                    : "Nepodařilo se smazat formulář"
            );
        } else {
            dispatch({
                type: "reset",
                data: {
                    conditions: [],
                    pricingDefinitions: [],
                    priceTiers: [],
                    capacityLimits: [],
                    showOptionCounts: [],
                    infoStatsConfig: undefined,
                    fields: [],
                },
            });
        }
        setDeleting(false);
    };

    const handleCreateConditionFromOption = (
        fieldId: string,
        fieldLabel: string,
        optionValue: string
    ) => {
        const condition: FormCondition = {
            id: crypto.randomUUID(),
            name: `${fieldLabel} je ${optionValue}`,
            rules: [
                {
                    type: "field_value",
                    fieldId,
                    operator: "equals",
                    value: optionValue,
                },
            ],
        };
        dispatch({ type: "addCondition", condition, afterFieldId: fieldId });
    };

    const handlePreview = async () => {
        setPreviewSaving(true);
        try {
            const { token } = await saveFormPreview(yearId, getFormData());
            setPreviewToken(token);
            window.open(`/nahled/${token}`, "_blank");
        } catch {
            setError("Nepodařilo se vytvořit náhled");
        } finally {
            setPreviewSaving(false);
        }
    };

    const hasElements =
        state.elements.length > 0 || initialFormData.fields.length > 0;

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
                    Formulář byl uložen
                </Alert>
            )}

            <FormBuilderToolbar
                saving={saving}
                previewSaving={previewSaving}
                canSave={
                    state.elements.length > 0 || state.conditions.length > 0
                }
                canPreview={state.elements.length > 0}
                previewToken={previewToken}
                readOnly={readOnly}
                onSave={handleSave}
                onPreview={handlePreview}
            />

            <Tabs
                value={tab}
                onChange={(_e, v) => setTab(v)}
                sx={{
                    mb: 2,
                    borderBottom: `1px solid ${p.line}`,
                    minHeight: 0,
                    "& .MuiTabs-indicator": {
                        backgroundColor: p.indigo,
                        height: 2,
                        borderRadius: 2,
                    },
                    "& .MuiTab-root": {
                        textTransform: "none",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        color: p.ink2,
                        minHeight: 0,
                        py: 1.25,
                        "&:hover": { color: p.ink },
                    },
                    "& .Mui-selected": { color: `${p.indigo} !important` },
                }}
            >
                <Tab label="Formulář" />
                <Tab label="Podmínky" />
                <Tab label="Ceník" />
            </Tabs>

            {tab === 0 && (
                <DndContext
                    id="form-builder-dnd"
                    sensors={sensors}
                    collisionDetection={collisionDetection}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDragEnd={onDragEnd}
                    onDragCancel={onDragCancel}
                >
                    <Box sx={{ display: "flex", gap: 3 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <FormBuilderCanvas
                                elements={state.elements}
                                conditions={state.conditions}
                                pricingDefinitions={state.pricingDefinitions}
                                usedFieldIds={usedFieldIds}
                                fieldExternalUsages={fieldExternalUsages}
                                readOnly={readOnly}
                                activeId={activeId}
                                onEditField={setEditingField}
                                onDeleteField={handleDeleteField}
                                onDeleteBlock={handleDeleteBlock}
                                onPatchField={handlePatchField}
                                onCreateCondition={
                                    handleCreateConditionFromOption
                                }
                            />
                            {!readOnly && (
                                <Box
                                    sx={{
                                        display: "flex",
                                        gap: 1,
                                        mt: 2,
                                        flexWrap: "wrap",
                                    }}
                                >
                                    {isMobile && (
                                        <Button
                                            startIcon={<Add />}
                                            onClick={() =>
                                                setTypeSelectorOpen(true)
                                            }
                                            sx={{
                                                textTransform: "none",
                                                fontWeight: 600,
                                                borderRadius: "10px",
                                                backgroundColor: p.surface,
                                                border: `1px dashed ${p.line}`,
                                                color: p.indigo,
                                                "&:hover": {
                                                    borderColor: p.indigo,
                                                    backgroundColor:
                                                        p.indigoSoft,
                                                },
                                            }}
                                        >
                                            Přidat pole
                                        </Button>
                                    )}
                                    <Box sx={{ flex: 1 }} />
                                    {hasElements && (
                                        <Button
                                            variant="contained"
                                            disableElevation
                                            startIcon={<Delete />}
                                            onClick={() =>
                                                setDeleteConfirmOpen(true)
                                            }
                                            disabled={deleting}
                                            sx={{
                                                textTransform: "none",
                                                fontWeight: 600,
                                                borderRadius: "10px",
                                                backgroundColor: p.neg,
                                                color: p.negInk,
                                                "&:hover": {
                                                    backgroundColor: "#fecaca",
                                                },
                                            }}
                                        >
                                            Smazat formulář
                                        </Button>
                                    )}
                                </Box>
                            )}
                        </Box>

                        {!isMobile && !readOnly && (
                            <Box
                                sx={{
                                    width: 220,
                                    flexShrink: 0,
                                    position: "sticky",
                                    top: 80,
                                    alignSelf: "flex-start",
                                    maxHeight: "calc(100vh - 96px)",
                                    overflow: "auto",
                                }}
                            >
                                <FieldPalette
                                    conditions={state.conditions}
                                    pricingDefinitions={
                                        state.pricingDefinitions
                                    }
                                    onAddField={(type) => addBlankField(type)}
                                    onAddConditionBlock={addBlock}
                                    onAddPricingField={(definitionId) => {
                                        const def =
                                            state.pricingDefinitions.find(
                                                (d) => d.id === definitionId
                                            );
                                        const t: FieldType =
                                            def?.type === "quantity"
                                                ? "pricing_quantity"
                                                : def?.multiSelect
                                                  ? "pricing_multi_select"
                                                  : "pricing_select";
                                        addBlankField(
                                            t,
                                            definitionId,
                                            def?.name
                                        );
                                    }}
                                />
                            </Box>
                        )}
                    </Box>

                    <DragOverlay dropAnimation={null}>
                        <DragOverlayContent
                            activeId={activeId}
                            elements={state.elements}
                            conditions={state.conditions}
                            pricingDefinitions={state.pricingDefinitions}
                        />
                    </DragOverlay>
                </DndContext>
            )}

            {tab === 1 && (
                <Box
                    sx={{
                        pointerEvents: readOnly ? "none" : undefined,
                        userSelect: readOnly ? "text" : undefined,
                    }}
                >
                    <ConditionEditor
                        conditions={state.conditions}
                        allFields={allFields}
                        elements={nestedFormData.fields}
                        onChange={(c) =>
                            dispatch({ type: "setConditions", conditions: c })
                        }
                        pricingDefinitions={state.pricingDefinitions}
                    />
                </Box>
            )}

            {tab === 2 && (
                <Box
                    sx={{
                        pointerEvents: readOnly ? "none" : undefined,
                        userSelect: readOnly ? "text" : undefined,
                    }}
                >
                    <PricingEditor
                        pricingDefinitions={state.pricingDefinitions}
                        priceTiers={state.priceTiers}
                        onPriceTiersChange={(t) =>
                            dispatch({ type: "setPriceTiers", tiers: t })
                        }
                        elements={nestedFormData.fields}
                        onChange={(d) =>
                            dispatch({
                                type: "setPricingDefinitions",
                                defs: d,
                            })
                        }
                    />
                </Box>
            )}

            {!readOnly && (
                <FieldTypeSelector
                    open={typeSelectorOpen}
                    onClose={() => setTypeSelectorOpen(false)}
                    onSelect={(type) => addBlankField(type)}
                />
            )}

            <FieldEditor
                open={!!editingField}
                field={editingField}
                onClose={() => setEditingField(null)}
                onSave={handleSaveField}
                conditions={state.conditions}
                pricingDefinitions={state.pricingDefinitions}
                priceTiers={state.priceTiers}
            />

            <DeleteFormDialog
                open={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={handleDelete}
            />

            <DeletionBlockDialog
                info={deletionBlock}
                onClose={() => setDeletionBlock(null)}
            />
        </Box>
    );
}
