"use client";

import { useState } from "react";
import {
    Box,
    ButtonBase,
    Collapse,
    ToggleButton,
    ToggleButtonGroup,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import {
    Add,
    Delete,
    ExpandMore,
    ExpandLess,
    AccountTree,
} from "@mui/icons-material";
import type {
    FormCondition,
    ConditionRule,
    FormField,
    FormElement,
    InputField,
    PricingDefinition,
} from "@/lib/types/registration-form";
import { isInputField } from "@/lib/types/registration-form";
import { getBlocksUsingCondition } from "@/lib/utils/condition-validation";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

// Builder-palette primitives (local to the form builder).

/** Kicker label — the signature uppercase section header. */
const kickerSx = {
    fontSize: 11,
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    fontWeight: 700,
    color: p.ink3,
};

/** Transparent icon button, indigo hover (destructive variant → danger). */
const iconBtnSx = {
    color: p.ink3,
    borderRadius: "8px",
    transition: "all 140ms ease",
    "&:hover": { color: p.indigo, backgroundColor: p.indigoSoft },
};
const iconBtnDangerSx = {
    ...iconBtnSx,
    "&:hover": { color: p.negInk, backgroundColor: p.neg },
};

/** Segmented AND/OR control — the rule-builder accent. */
const andOrGroupSx = {
    backgroundColor: p.surface2,
    border: `1px solid ${p.line}`,
    borderRadius: "10px",
    p: "3px",
    gap: "2px",
    "& .MuiToggleButton-root": {
        border: 0,
        borderRadius: "7px !important",
        fontSize: "0.65rem",
        fontWeight: 700,
        letterSpacing: "0.04em",
        height: 22,
        px: 1,
        py: 0,
        lineHeight: 1,
        color: p.ink2,
        transition: "all 120ms ease",
        "&:hover": { backgroundColor: "transparent", color: p.indigo },
    },
};
const andToggleSx = {
    "&.Mui-selected": {
        backgroundColor: p.indigo,
        color: "white",
        "&:hover": { backgroundColor: "#4338ca", color: "white" },
    },
};
const orToggleSx = {
    "&.Mui-selected": {
        backgroundColor: p.or,
        color: "white",
        "&:hover": { backgroundColor: p.or, color: "white" },
    },
};

interface ConditionEditorProps {
    conditions: FormCondition[];
    allFields: FormField[];
    elements: FormElement[];
    onChange: (conditions: FormCondition[]) => void;
    pricingDefinitions?: PricingDefinition[];
}

interface BlockInfo {
    conditionName: string;
    blockCount: number;
}

export function ConditionEditor({
    conditions,
    allFields,
    elements,
    onChange,
    pricingDefinitions,
}: ConditionEditorProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [blockInfo, setBlockInfo] = useState<BlockInfo | null>(null);

    const inputFields = allFields.filter((f): f is InputField =>
        isInputField(f)
    );

    const handleAddCondition = () => {
        const newCondition: FormCondition = {
            id: crypto.randomUUID(),
            name: "",
            rules: [
                {
                    type: "field_value",
                    fieldId: "",
                    operator: "equals",
                    value: "",
                },
            ],
        };
        onChange([...conditions, newCondition]);
        setExpandedId(newCondition.id);
    };

    const handleUpdateCondition = (
        id: string,
        updates: Partial<FormCondition>
    ) => {
        onChange(
            conditions.map((c) => (c.id === id ? { ...c, ...updates } : c))
        );
    };

    const handleDeleteCondition = (id: string) => {
        const blocks = getBlocksUsingCondition(id, elements);
        if (blocks.length > 0) {
            const condition = conditions.find((c) => c.id === id);
            setBlockInfo({
                conditionName: condition?.name || "(nepojmenovaná)",
                blockCount: blocks.length,
            });
            return;
        }
        onChange(conditions.filter((c) => c.id !== id));
        if (expandedId === id) setExpandedId(null);
    };

    const handleUpdateRule = (
        conditionId: string,
        ruleIndex: number,
        updates: Partial<ConditionRule>
    ) => {
        onChange(
            conditions.map((c) => {
                if (c.id !== conditionId) return c;
                const newRules = [...c.rules];
                newRules[ruleIndex] = { ...newRules[ruleIndex], ...updates };
                return { ...c, rules: newRules };
            })
        );
    };

    const handleAddRule = (conditionId: string) => {
        onChange(
            conditions.map((c) => {
                if (c.id !== conditionId) return c;
                return {
                    ...c,
                    rules: [
                        ...c.rules,
                        {
                            type: "field_value" as const,
                            fieldId: "",
                            operator: "equals" as const,
                            value: "",
                            connector: "AND" as const,
                        },
                    ],
                };
            })
        );
    };

    const handleUpdateConnector = (
        conditionId: string,
        ruleIndex: number,
        connector: "AND" | "OR"
    ) => {
        onChange(
            conditions.map((c) => {
                if (c.id !== conditionId) return c;
                const newRules = [...c.rules];
                newRules[ruleIndex] = { ...newRules[ruleIndex], connector };
                return { ...c, rules: newRules };
            })
        );
    };

    const handleDeleteRule = (conditionId: string, ruleIndex: number) => {
        onChange(
            conditions.map((c) => {
                if (c.id !== conditionId) return c;
                return {
                    ...c,
                    rules: c.rules.filter((_, i) => i !== ruleIndex),
                };
            })
        );
    };

    return (
        <Box>
            <Typography
                sx={{
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: p.ink,
                    mb: 0.5,
                }}
            >
                Podmínky
            </Typography>
            <Typography variant="body2" sx={{ color: p.ink2, mb: 2 }}>
                Definujte pojmenované podmínky, které poté přetáhněte jako bloky
                do formuláře. Pole uvnitř bloku se zobrazí, pouze pokud podmínka
                platí.
            </Typography>

            {conditions.length === 0 && (
                <Box
                    sx={{
                        border: `1px dashed ${p.line}`,
                        borderRadius: "14px",
                        textAlign: "center",
                        color: p.ink3,
                        py: 4,
                        px: 3,
                        fontSize: "0.875rem",
                    }}
                >
                    Zatím nejsou definovány žádné podmínky.
                </Box>
            )}

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {conditions.map((condition) => {
                    const isExpanded = expandedId === condition.id;
                    return (
                        <Box
                            key={condition.id}
                            sx={{
                                backgroundColor: p.surface,
                                border: `1px solid ${p.line}`,
                                borderRadius: "14px",
                                overflow: "hidden",
                            }}
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1.5,
                                    px: 2,
                                    py: 1.5,
                                    cursor: "pointer",
                                    borderBottom: isExpanded
                                        ? `1px solid ${p.line}`
                                        : "none",
                                    background: `linear-gradient(180deg, ${p.surface}, ${p.surface2})`,
                                }}
                                onClick={() =>
                                    setExpandedId(
                                        isExpanded ? null : condition.id
                                    )
                                }
                            >
                                <Box
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: "8px",
                                        backgroundColor: p.fieldInk,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                    }}
                                >
                                    <AccountTree
                                        sx={{ fontSize: 18, color: "white" }}
                                    />
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography
                                        sx={{
                                            fontSize: "0.95rem",
                                            fontWeight: 600,
                                            color: p.ink,
                                        }}
                                        noWrap
                                    >
                                        {condition.name || "(nepojmenovaná)"}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={{ color: p.ink3 }}
                                    >
                                        {condition.rules.length}{" "}
                                        {condition.rules.length === 1
                                            ? "pravidlo"
                                            : "pravidla"}
                                    </Typography>
                                </Box>
                                {isExpanded ? (
                                    <ExpandLess sx={{ color: p.ink3 }} />
                                ) : (
                                    <ExpandMore sx={{ color: p.ink3 }} />
                                )}
                                <Tooltip title="Smazat podmínku">
                                    <IconButton
                                        size="small"
                                        sx={iconBtnDangerSx}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteCondition(condition.id);
                                        }}
                                    >
                                        <Delete fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            <Collapse in={isExpanded}>
                                <Box sx={{ p: 2.5 }}>
                                    <TextField
                                        label="Název podmínky"
                                        value={condition.name}
                                        onChange={(e) =>
                                            handleUpdateCondition(
                                                condition.id,
                                                { name: e.target.value }
                                            )
                                        }
                                        size="small"
                                        fullWidth
                                        sx={{ ...builderFieldSx, mb: 2 }}
                                        placeholder='např. "Děti", "VIP"'
                                    />

                                    <Typography sx={{ ...kickerSx, mb: 1 }}>
                                        Pravidla
                                    </Typography>

                                    {/* Column labels */}
                                    {condition.rules.length > 0 && (
                                        <Box
                                            sx={{
                                                display: "flex",
                                                gap: 1,
                                                px: 1.5,
                                                mb: 0.5,
                                            }}
                                        >
                                            <Typography
                                                variant="overline"
                                                sx={{
                                                    flex: 1,
                                                    fontSize: "0.65rem",
                                                    letterSpacing: 1,
                                                    color: p.ink3,
                                                }}
                                            >
                                                POLE
                                            </Typography>
                                        </Box>
                                    )}

                                    {condition.rules.map((rule, ruleIdx) => (
                                        <Box key={ruleIdx}>
                                            {ruleIdx > 0 && (
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        justifyContent:
                                                            "center",
                                                        my: 0.5,
                                                    }}
                                                >
                                                    <ToggleButtonGroup
                                                        value={
                                                            rule.connector ??
                                                            "AND"
                                                        }
                                                        exclusive
                                                        size="small"
                                                        onChange={(_, val) => {
                                                            if (
                                                                val === "AND" ||
                                                                val === "OR"
                                                            ) {
                                                                handleUpdateConnector(
                                                                    condition.id,
                                                                    ruleIdx,
                                                                    val
                                                                );
                                                            }
                                                        }}
                                                        sx={andOrGroupSx}
                                                    >
                                                        <ToggleButton
                                                            value="AND"
                                                            sx={andToggleSx}
                                                        >
                                                            AND
                                                        </ToggleButton>
                                                        <ToggleButton
                                                            value="OR"
                                                            sx={orToggleSx}
                                                        >
                                                            OR
                                                        </ToggleButton>
                                                    </ToggleButtonGroup>
                                                </Box>
                                            )}
                                            <RuleRow
                                                rule={rule}
                                                inputFields={inputFields}
                                                allFields={allFields}
                                                pricingDefinitions={
                                                    pricingDefinitions
                                                }
                                                onUpdate={(updates) =>
                                                    handleUpdateRule(
                                                        condition.id,
                                                        ruleIdx,
                                                        updates
                                                    )
                                                }
                                                onDelete={() =>
                                                    handleDeleteRule(
                                                        condition.id,
                                                        ruleIdx
                                                    )
                                                }
                                                canDelete={
                                                    condition.rules.length > 1
                                                }
                                            />
                                        </Box>
                                    ))}

                                    {/* Action summary */}
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                            mt: 1.5,
                                            px: 1.5,
                                            py: 1.25,
                                            borderRadius: "10px",
                                            backgroundColor: p.value,
                                        }}
                                    >
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: p.valueInk,
                                                fontWeight: 600,
                                                fontSize: "0.82rem",
                                            }}
                                        >
                                            Pak provést:
                                        </Typography>
                                        <Box
                                            sx={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "5px",
                                                fontSize: "0.7rem",
                                                fontWeight: 700,
                                                px: "10px",
                                                py: "3px",
                                                borderRadius: "20px",
                                                backgroundColor: p.value,
                                                color: p.valueInk,
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 7,
                                                    height: 7,
                                                    borderRadius: "50%",
                                                    backgroundColor: p.valueInk,
                                                }}
                                            />
                                            ZOBRAZIT
                                        </Box>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: p.valueInk,
                                                fontSize: "0.82rem",
                                            }}
                                        >
                                            pole v bloku
                                        </Typography>
                                    </Box>

                                    <Box sx={{ mt: 1.5 }}>
                                        <ButtonBase
                                            onClick={() =>
                                                handleAddRule(condition.id)
                                            }
                                            sx={{
                                                py: "7px",
                                                px: "12px",
                                                backgroundColor: p.surface,
                                                border: `1px dashed ${p.line}`,
                                                borderRadius: "10px",
                                                color: p.indigo,
                                                fontSize: 13,
                                                fontWeight: 600,
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "6px",
                                                transition: "all 140ms ease",
                                                "&:hover": {
                                                    borderColor: p.indigo,
                                                    backgroundColor:
                                                        p.indigoSoft,
                                                },
                                            }}
                                        >
                                            <Add sx={{ fontSize: 16 }} />
                                            Přidat pravidlo
                                        </ButtonBase>
                                    </Box>
                                </Box>
                            </Collapse>
                        </Box>
                    );
                })}
            </Box>

            {/* Add condition area */}
            <ButtonBase
                onClick={handleAddCondition}
                sx={{
                    width: "100%",
                    mt: 2,
                    p: 3,
                    border: `1px dashed ${p.line}`,
                    borderRadius: "14px",
                    backgroundColor: p.surface,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 1,
                    color: p.indigo,
                    transition: "all 140ms ease",
                    "&:hover": {
                        borderColor: p.indigo,
                        backgroundColor: p.indigoSoft,
                    },
                }}
            >
                <Add sx={{ fontSize: 20 }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Přidat novou podmínku
                </Typography>
            </ButtonBase>

            <Dialog
                open={!!blockInfo}
                onClose={() => setBlockInfo(null)}
                PaperProps={{ sx: { borderRadius: "14px" } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>
                    Nelze smazat podmínku
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Podmínka &bdquo;{blockInfo?.conditionName}&ldquo; je
                        používána v {blockInfo?.blockCount}{" "}
                        {blockInfo?.blockCount === 1 ? "bloku" : "blocích"} ve
                        formuláři. Nejdříve odstraňte všechny bloky této
                        podmínky z formuláře.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setBlockInfo(null)}
                        variant="contained"
                        disableElevation
                        sx={{
                            borderRadius: "10px",
                            textTransform: "none",
                            backgroundColor: p.indigo,
                            "&:hover": { backgroundColor: "#4338ca" },
                        }}
                    >
                        Rozumím
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export interface RuleRowProps {
    rule: ConditionRule;
    inputFields: InputField[];
    allFields: FormField[];
    pricingDefinitions?: PricingDefinition[];
    onUpdate: (updates: Partial<ConditionRule>) => void;
    onDelete: () => void;
    canDelete: boolean;
    /** When true, lays out field/operator/value/delete on a single row. Defaults to false (two-row layout). */
    compact?: boolean;
}

export function RuleRow({
    rule,
    inputFields,
    allFields,
    pricingDefinitions,
    onUpdate,
    onDelete,
    canDelete,
    compact = false,
}: RuleRowProps) {
    const targetField = allFields.find((f) => f.id === rule.fieldId);
    const targetInput =
        targetField && isInputField(targetField) ? targetField : null;
    const isQuantityField = targetInput?.type === "pricing_quantity";
    const showValue =
        rule.operator !== "is_set" &&
        rule.operator !== "is_not_set" &&
        rule.operator !== "quantity_any_gt_zero";

    const fieldSelect = (
        <FormControl
            size="small"
            sx={{
                ...builderFieldSx,
                flex: 1,
                minWidth: compact ? 140 : undefined,
            }}
        >
            <InputLabel>Pole</InputLabel>
            <Select
                value={rule.fieldId || ""}
                onChange={(e) => {
                    const newFieldId = e.target.value;
                    const newField = inputFields.find(
                        (f) => f.id === newFieldId
                    );
                    const updates: Partial<ConditionRule> = {
                        fieldId: newFieldId,
                        value: "",
                    };
                    if (newField?.type === "pricing_quantity") {
                        updates.operator = "quantity_gt_zero";
                    } else if (rule.operator === "quantity_gt_zero") {
                        updates.operator = "equals";
                    }
                    onUpdate(updates);
                }}
                label="Pole"
            >
                {inputFields.map((f) => (
                    <MenuItem key={f.id} value={f.id}>
                        {f.label}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );

    const operatorSelect = (
        <FormControl
            size="small"
            sx={{ ...builderFieldSx, minWidth: compact ? 150 : 160 }}
        >
            <InputLabel>Operátor</InputLabel>
            <Select
                value={
                    rule.operator ||
                    (isQuantityField ? "quantity_gt_zero" : "equals")
                }
                onChange={(e) =>
                    onUpdate({
                        operator: e.target.value as ConditionRule["operator"],
                    })
                }
                label="Operátor"
            >
                {isQuantityField
                    ? [
                          <MenuItem
                              key="quantity_gt_zero"
                              value="quantity_gt_zero"
                          >
                              konkrétní volba: počet &gt; 0
                          </MenuItem>,
                          <MenuItem
                              key="quantity_any_gt_zero"
                              value="quantity_any_gt_zero"
                          >
                              jakákoli volba: počet &gt; 0
                          </MenuItem>,
                      ]
                    : [
                          <MenuItem key="equals" value="equals">
                              se rovná
                          </MenuItem>,
                          <MenuItem key="not_equals" value="not_equals">
                              se nerovná
                          </MenuItem>,
                          <MenuItem key="is_set" value="is_set">
                              je vyplněno
                          </MenuItem>,
                          <MenuItem key="is_not_set" value="is_not_set">
                              není vyplněno
                          </MenuItem>,
                      ]}
            </Select>
        </FormControl>
    );

    const valuePicker =
        showValue &&
        (compact ? (
            <Box sx={{ flex: 1, minWidth: 140 }}>
                <FieldValuePicker
                    targetField={targetInput}
                    pricingDefinitions={pricingDefinitions}
                    value={rule.value || ""}
                    onChange={(value) => onUpdate({ value })}
                />
            </Box>
        ) : (
            <FieldValuePicker
                targetField={targetInput}
                pricingDefinitions={pricingDefinitions}
                value={rule.value || ""}
                onChange={(value) => onUpdate({ value })}
            />
        ));

    const deleteButton = canDelete && (
        <Tooltip title="Smazat pravidlo">
            <IconButton size="small" sx={iconBtnDangerSx} onClick={onDelete}>
                <Delete fontSize="small" />
            </IconButton>
        </Tooltip>
    );

    if (compact) {
        return (
            <Box
                sx={{
                    display: "flex",
                    gap: 1,
                    alignItems: "center",
                    p: 1,
                    border: `1px solid ${p.lineSoft}`,
                    borderRadius: "10px",
                    backgroundColor: p.surface2,
                }}
            >
                {fieldSelect}
                {operatorSelect}
                {valuePicker}
                {deleteButton}
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                p: 1.5,
                border: `1px solid ${p.lineSoft}`,
                borderRadius: "10px",
                backgroundColor: p.surface2,
            }}
        >
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                {fieldSelect}
                {deleteButton}
            </Box>

            <Box sx={{ display: "flex", gap: 1 }}>
                {operatorSelect}
                {valuePicker}
            </Box>
        </Box>
    );
}

export function FieldValuePicker({
    targetField,
    pricingDefinitions,
    value,
    onChange,
}: {
    targetField: InputField | null;
    pricingDefinitions?: PricingDefinition[];
    value: string;
    onChange: (value: string) => void;
}) {
    if (!targetField) {
        return (
            <TextField
                label="Hodnota"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                size="small"
                fullWidth
                disabled
                placeholder="Vyberte pole"
                sx={builderFieldSx}
            />
        );
    }

    if (targetField.type === "checkbox") {
        return (
            <FormControl size="small" fullWidth sx={builderFieldSx}>
                <InputLabel>Hodnota</InputLabel>
                <Select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    label="Hodnota"
                >
                    <MenuItem value="true">Zaškrtnuto</MenuItem>
                    <MenuItem value="false">Nezaškrtnuto</MenuItem>
                </Select>
            </FormControl>
        );
    }

    if (
        (targetField.type === "select" || targetField.type === "radio") &&
        targetField.options
    ) {
        return (
            <FormControl size="small" fullWidth sx={builderFieldSx}>
                <InputLabel>Hodnota</InputLabel>
                <Select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    label="Hodnota"
                >
                    {targetField.options.map((opt) => (
                        <MenuItem key={opt} value={opt}>
                            {opt}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        );
    }

    if (
        (targetField.type === "pricing_select" ||
            targetField.type === "pricing_multi_select" ||
            targetField.type === "pricing_quantity") &&
        targetField.pricingId &&
        pricingDefinitions
    ) {
        const def = pricingDefinitions.find(
            (d) => d.id === targetField.pricingId
        );
        if (def) {
            const label =
                targetField.type === "pricing_quantity" ? "Volba" : "Hodnota";
            return (
                <FormControl size="small" fullWidth sx={builderFieldSx}>
                    <InputLabel>{label}</InputLabel>
                    <Select
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        label={label}
                    >
                        {def.options.map((opt) => (
                            <MenuItem key={opt.id} value={opt.name}>
                                {opt.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            );
        }
    }

    return (
        <TextField
            label="Hodnota"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            size="small"
            fullWidth
            sx={builderFieldSx}
        />
    );
}
