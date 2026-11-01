"use client";

import { memo } from "react";
import { Box, Typography, Chip, IconButton, Tooltip } from "@mui/material";
import {
    Edit,
    Delete,
    AddCircleOutline,
    People,
    EditNote,
} from "@mui/icons-material";
import type {
    FormField,
    InputField,
    PricingDefinition,
} from "@/lib/types/registration-form";
import { isInputField, FIELD_TYPE_META } from "@/lib/types/registration-form";
import { FIELD_TYPE_ICONS } from "./field-type-icons";
import type { FieldExternalUsage } from "@/lib/utils/condition-validation";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface FieldListItemProps {
    field: FormField;
    onEdit: (field: FormField) => void;
    onDelete: (fieldId: string) => void;
    onToggleField?: (fieldId: string, updates: Partial<InputField>) => void;
    usedInCondition?: boolean;
    pricingDefinitions?: PricingDefinition[];
    onCreateCondition?: (
        fieldId: string,
        fieldLabel: string,
        optionValue: string
    ) => void;
    externalUsages?: FieldExternalUsage[];
}

function FieldListItemImpl({
    field,
    onEdit,
    onDelete,
    onToggleField,
    usedInCondition,
    pricingDefinitions,
    onCreateCondition,
    externalUsages,
}: FieldListItemProps) {
    const meta = FIELD_TYPE_META[field.type];
    const isInput = isInputField(field);

    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1.5,
                py: 1.5,
                minHeight: 56,
            }}
        >
            <Box sx={{ color: p.ink3, display: "flex" }}>
                {FIELD_TYPE_ICONS[meta.icon]}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box
                    component="span"
                    sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        color: p.indigo,
                        backgroundColor: p.indigoSoft,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        fontSize: "0.6rem",
                        lineHeight: 1,
                        px: "8px",
                        py: "3px",
                        borderRadius: "6px",
                        mb: 0.5,
                    }}
                >
                    {meta.label}
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography
                        variant="body2"
                        noWrap
                        fontWeight={600}
                        sx={{ color: p.ink }}
                    >
                        {isInput ? field.label : field.text}
                    </Typography>
                    {usedInCondition && (
                        <Box
                            component="span"
                            sx={{
                                fontSize: "0.7rem",
                                fontWeight: 600,
                                color: p.fieldInk,
                                backgroundColor: p.field,
                                px: "8px",
                                py: "2px",
                                borderRadius: "6px",
                            }}
                        >
                            Podmínka
                        </Box>
                    )}
                    {externalUsages?.map((usage) => (
                        <Chip
                            key={usage.label}
                            label={usage.label}
                            size="small"
                            variant="outlined"
                            color={usage.color}
                            sx={{ fontSize: "0.7rem", height: 20 }}
                        />
                    ))}
                </Box>
                {isInput &&
                    (field.type === "select" || field.type === "radio") &&
                    field.options &&
                    field.options.length > 0 && (
                        <Box sx={{ mt: 0.5 }}>
                            {field.options.map((opt, idx) => (
                                <Box
                                    key={idx}
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 0.5,
                                    }}
                                >
                                    <Typography
                                        variant="caption"
                                        sx={{ lineHeight: 1.4, color: p.ink2 }}
                                    >
                                        {opt || `Možnost ${idx + 1}`}
                                    </Typography>
                                    {onCreateCondition && opt && (
                                        <Tooltip title="Vytvořit podmínku">
                                            <IconButton
                                                size="small"
                                                sx={{
                                                    p: 0,
                                                    ml: 0.5,
                                                    minWidth: 0,
                                                    minHeight: 0,
                                                    lineHeight: 1,
                                                    color: p.ink3,
                                                    "&:hover": {
                                                        color: p.indigo,
                                                        backgroundColor:
                                                            "transparent",
                                                    },
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onCreateCondition(
                                                        field.id,
                                                        field.label,
                                                        opt
                                                    );
                                                }}
                                            >
                                                <AddCircleOutline
                                                    sx={{ fontSize: 14 }}
                                                />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </Box>
                            ))}
                        </Box>
                    )}
                {isInput &&
                    (field.type === "pricing_select" ||
                        field.type === "pricing_quantity" ||
                        field.type === "pricing_multi_select") &&
                    field.pricingId &&
                    pricingDefinitions &&
                    (() => {
                        const def = pricingDefinitions.find(
                            (d) => d.id === field.pricingId
                        );
                        const label =
                            field.type === "pricing_quantity"
                                ? `Cenový počet: ${def?.name ?? ""}${def?.unitName ? ` (${def.unitName})` : ""}`
                                : field.type === "pricing_multi_select"
                                  ? `Cenový vícevýběr: ${def?.name ?? ""}`
                                  : `Ceník: ${def?.name ?? ""}`;
                        return def ? (
                            <Typography
                                variant="caption"
                                sx={{ color: p.ink2 }}
                            >
                                {label}
                            </Typography>
                        ) : null;
                    })()}
            </Box>
            <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
                {isInput && onToggleField && (
                    <>
                        <Tooltip
                            title={
                                field.required
                                    ? "Zrušit povinné"
                                    : "Nastavit jako povinné"
                            }
                        >
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleField(field.id, {
                                        required: !field.required,
                                    });
                                }}
                                sx={{
                                    border: `1px solid ${
                                        field.required ? p.negInk : p.line
                                    }`,
                                    color: field.required ? p.negInk : p.ink3,
                                    borderRadius: "8px",
                                    width: 28,
                                    height: 28,
                                    fontSize: "1rem",
                                    fontWeight: 700,
                                    "&:hover": {
                                        borderColor: p.negInk,
                                        color: p.negInk,
                                        backgroundColor: p.neg,
                                    },
                                }}
                            >
                                *
                            </IconButton>
                        </Tooltip>
                        {!field.type.startsWith("pricing_") && (
                            <Tooltip
                                title={
                                    field.editable
                                        ? "Zrušit upravitelné po odeslání"
                                        : "Upravitelné po odeslání"
                                }
                            >
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleField(field.id, {
                                            editable:
                                                !field.editable || undefined,
                                        });
                                    }}
                                    sx={{
                                        border: `1px solid ${
                                            field.editable ? p.fieldInk : p.line
                                        }`,
                                        color: field.editable
                                            ? p.fieldInk
                                            : p.ink3,
                                        borderRadius: "8px",
                                        width: 28,
                                        height: 28,
                                        "&:hover": {
                                            borderColor: p.fieldInk,
                                            color: p.fieldInk,
                                            backgroundColor: p.field,
                                        },
                                    }}
                                >
                                    <EditNote sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                        <Tooltip
                            title={
                                field.includeForAdditionalPeople
                                    ? "Zrušit pro další osoby"
                                    : "Zobrazit pro další osoby"
                            }
                        >
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleField(field.id, {
                                        includeForAdditionalPeople:
                                            !field.includeForAdditionalPeople ||
                                            undefined,
                                    });
                                }}
                                sx={{
                                    border: `1px solid ${
                                        field.includeForAdditionalPeople
                                            ? p.warnInk
                                            : p.line
                                    }`,
                                    color: field.includeForAdditionalPeople
                                        ? p.warnInk
                                        : p.ink3,
                                    borderRadius: "8px",
                                    width: 28,
                                    height: 28,
                                    "&:hover": {
                                        borderColor: p.warnInk,
                                        color: p.warnInk,
                                        backgroundColor: p.warnSoft,
                                    },
                                }}
                            >
                                <People sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                    </>
                )}
                <Tooltip title="Upravit">
                    <IconButton
                        size="small"
                        onClick={() => onEdit(field)}
                        sx={{
                            color: p.ink3,
                            borderRadius: "8px",
                            "&:hover": {
                                color: p.indigo,
                                backgroundColor: p.indigoSoft,
                            },
                        }}
                    >
                        <Edit fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Smazat">
                    <IconButton
                        size="small"
                        onClick={() => onDelete(field.id)}
                        sx={{
                            color: p.ink3,
                            borderRadius: "8px",
                            "&:hover": {
                                color: p.negInk,
                                backgroundColor: p.neg,
                            },
                        }}
                    >
                        <Delete fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>
    );
}

export const FieldListItem = memo(FieldListItemImpl);
