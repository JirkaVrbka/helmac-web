"use client";

import {
    Box,
    TextField,
    Typography,
    Divider,
    FormControlLabel,
    Checkbox,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    RadioGroup,
    Radio,
} from "@mui/material";
import type {
    FormField,
    FormElement,
    FormCondition,
    PricingDefinition,
} from "@/lib/types/registration-form";
import { isInputField, isConditionBlock } from "@/lib/types/registration-form";
import { getCurrentPrice, formatPrice } from "@/lib/utils/pricing";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

const MONO = "'JetBrains Mono', monospace";

// Shared inline field-label treatment (builder design system).
const fieldLabelSx = {
    mb: 1,
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: p.ink2,
} as const;

interface FormPreviewProps {
    elements: FormElement[];
    conditions: FormCondition[];
    pricingDefinitions?: PricingDefinition[];
    priceTiers?: string[];
}

export function FormPreview({
    elements,
    conditions,
    pricingDefinitions,
    priceTiers,
}: FormPreviewProps) {
    if (elements.length === 0) {
        return (
            <Box
                sx={{
                    border: `1px dashed ${p.line}`,
                    borderRadius: "14px",
                    py: 5,
                    px: 3,
                    textAlign: "center",
                    color: p.ink3,
                }}
            >
                <Typography sx={{ color: p.ink3 }}>
                    Formulář je prázdný. Přidejte pole pomocí tlačítka výše.
                </Typography>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                backgroundColor: p.surface,
                border: `1px solid ${p.line}`,
                borderRadius: "14px",
                overflow: "hidden",
            }}
        >
            <Box
                sx={{
                    px: "20px",
                    py: "14px",
                    borderBottom: `1px solid ${p.line}`,
                    background: `linear-gradient(180deg, ${p.surface}, ${p.surface2})`,
                }}
            >
                <Typography
                    sx={{
                        fontSize: 11,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: p.ink3,
                        fontWeight: 700,
                    }}
                >
                    Náhled formuláře
                </Typography>
            </Box>
            <Box
                sx={{
                    p: 2.5,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                }}
            >
                {elements.map((el) => {
                    if (isConditionBlock(el)) {
                        const condition = conditions.find(
                            (c) => c.id === el.conditionId
                        );
                        return (
                            <Box
                                key={el.id}
                                sx={{
                                    border: `1px solid ${p.line}`,
                                    borderLeftWidth: "4px",
                                    borderLeftColor: p.fieldInk,
                                    px: 1.5,
                                    py: 1.25,
                                    backgroundColor: p.surface2,
                                    borderRadius: "10px",
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    fontWeight={700}
                                    sx={{
                                        mb: 1,
                                        display: "block",
                                        color: p.fieldInk,
                                    }}
                                >
                                    Podmínka:{" "}
                                    {condition?.name || "(nepojmenovaná)"}
                                </Typography>
                                <Box
                                    sx={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 2,
                                    }}
                                >
                                    {el.children.map((child) => (
                                        <PreviewField
                                            key={child.id}
                                            field={child}
                                            pricingDefinitions={
                                                pricingDefinitions
                                            }
                                            priceTiers={priceTiers}
                                        />
                                    ))}
                                </Box>
                            </Box>
                        );
                    }
                    return (
                        <PreviewField
                            key={el.id}
                            field={el}
                            pricingDefinitions={pricingDefinitions}
                            priceTiers={priceTiers}
                        />
                    );
                })}
            </Box>
        </Box>
    );
}

function PreviewField({
    field,
    pricingDefinitions,
    priceTiers,
}: {
    field: FormField;
    pricingDefinitions?: PricingDefinition[];
    priceTiers?: string[];
}) {
    if (!isInputField(field)) {
        if (field.type === "heading") {
            return (
                <Box>
                    <Typography
                        variant="h5"
                        sx={{ mt: 1, color: p.ink, fontWeight: 700 }}
                    >
                        {field.text}
                    </Typography>
                    <Divider sx={{ borderColor: p.line, mt: 1 }} />
                </Box>
            );
        }
        return (
            <Typography variant="body1" sx={{ color: p.ink2 }}>
                {field.text}
            </Typography>
        );
    }

    switch (field.type) {
        case "checkbox":
            return (
                <FormControlLabel
                    control={
                        <Checkbox
                            disabled
                            sx={{
                                color: p.ink3,
                                "&.Mui-checked": { color: p.indigo },
                            }}
                        />
                    }
                    label={`${field.label}${field.required ? " *" : ""}`}
                    sx={{
                        "& .MuiFormControlLabel-label": { color: p.ink },
                    }}
                />
            );

        case "select":
            return (
                <FormControl fullWidth disabled sx={builderFieldSx}>
                    <InputLabel>{`${field.label}${field.required ? " *" : ""}`}</InputLabel>
                    <Select
                        value=""
                        label={`${field.label}${field.required ? " *" : ""}`}
                    >
                        {(field.options || []).map((opt) => (
                            <MenuItem key={opt} value={opt}>
                                {opt}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            );

        case "radio":
            return (
                <FormControl disabled>
                    <Typography variant="body2" sx={fieldLabelSx}>
                        {field.label}
                        {field.required ? " *" : ""}
                    </Typography>
                    <RadioGroup>
                        {(field.options || []).map((opt) => (
                            <FormControlLabel
                                key={opt}
                                value={opt}
                                control={
                                    <Radio
                                        sx={{
                                            color: p.ink3,
                                            "&.Mui-checked": {
                                                color: p.indigo,
                                            },
                                        }}
                                    />
                                }
                                label={opt}
                                sx={{
                                    "& .MuiFormControlLabel-label": {
                                        color: p.ink,
                                    },
                                }}
                            />
                        ))}
                    </RadioGroup>
                </FormControl>
            );

        case "pricing_select": {
            const def = pricingDefinitions?.find(
                (d) => d.id === field.pricingId
            );
            if (!def)
                return (
                    <Typography variant="body2" sx={{ color: p.negInk }}>
                        Cenová skupina nenalezena
                    </Typography>
                );
            return (
                <Box>
                    <Typography variant="body2" sx={fieldLabelSx}>
                        {field.label}
                        {field.required ? " *" : ""}
                    </Typography>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                        }}
                    >
                        {def.options.map((opt) => {
                            const price = getCurrentPrice(
                                def.usePriceTiers ? (priceTiers ?? []) : [],
                                opt.prices
                            );
                            return (
                                <Box
                                    key={opt.id}
                                    sx={{
                                        p: 1.5,
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        border: `1px solid ${p.line}`,
                                        borderRadius: "10px",
                                        backgroundColor: p.surface,
                                    }}
                                >
                                    <Box>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontWeight: 600,
                                                color: p.ink,
                                            }}
                                        >
                                            {opt.name}
                                        </Typography>
                                        {opt.description && (
                                            <Typography
                                                variant="caption"
                                                sx={{ color: p.ink3 }}
                                            >
                                                {opt.description}
                                            </Typography>
                                        )}
                                    </Box>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontWeight: 600,
                                            color: p.indigo,
                                            fontFamily: MONO,
                                        }}
                                    >
                                        {formatPrice(price)}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                </Box>
            );
        }

        case "pricing_quantity": {
            const def = pricingDefinitions?.find(
                (d) => d.id === field.pricingId
            );
            if (!def)
                return (
                    <Typography variant="body2" sx={{ color: p.negInk }}>
                        Cenová skupina nenalezena
                    </Typography>
                );
            const unitOpt = def.options[0];
            const unitPrice = unitOpt
                ? getCurrentPrice(
                      def.usePriceTiers ? (priceTiers ?? []) : [],
                      unitOpt.prices
                  )
                : 0;
            return (
                <Box>
                    <Typography variant="body2" sx={fieldLabelSx}>
                        {field.label}
                        {field.required ? " *" : ""}
                    </Typography>
                    {unitOpt?.description && (
                        <Typography
                            variant="caption"
                            sx={{ mb: 1, display: "block", color: p.ink3 }}
                        >
                            {unitOpt.description}
                        </Typography>
                    )}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <TextField
                            type="number"
                            size="small"
                            disabled
                            value={0}
                            sx={{
                                ...(builderFieldSx as Record<string, unknown>),
                                width: 120,
                            }}
                            inputProps={{ min: 0 }}
                        />
                        {def.unitName && (
                            <Typography variant="body2" sx={{ color: p.ink2 }}>
                                {def.unitName}
                            </Typography>
                        )}
                        <Typography
                            variant="body2"
                            sx={{
                                fontWeight: 600,
                                color: p.fieldInk,
                                fontFamily: MONO,
                            }}
                        >
                            {formatPrice(unitPrice)} / {def.unitName || "ks"}
                        </Typography>
                    </Box>
                </Box>
            );
        }

        case "pricing_multi_select": {
            const msDef = pricingDefinitions?.find(
                (d) => d.id === field.pricingId
            );
            if (!msDef)
                return (
                    <Typography variant="body2" sx={{ color: p.negInk }}>
                        Cenová skupina nenalezena
                    </Typography>
                );
            return (
                <Box>
                    <Typography variant="body2" sx={fieldLabelSx}>
                        {field.label}
                        {field.required ? " *" : ""} (vícevýběr)
                    </Typography>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                        }}
                    >
                        {msDef.options.map((opt) => {
                            const price = getCurrentPrice(
                                msDef.usePriceTiers ? (priceTiers ?? []) : [],
                                opt.prices
                            );
                            return (
                                <Box
                                    key={opt.id}
                                    sx={{
                                        p: 1.5,
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        border: `1px solid ${p.line}`,
                                        borderRadius: "10px",
                                        backgroundColor: p.surface,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                        }}
                                    >
                                        <Checkbox
                                            disabled
                                            size="small"
                                            sx={{
                                                color: p.ink3,
                                                "&.Mui-checked": {
                                                    color: p.indigo,
                                                },
                                            }}
                                        />
                                        <Box>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 600,
                                                    color: p.ink,
                                                }}
                                            >
                                                {opt.name}
                                            </Typography>
                                            {opt.description && (
                                                <Typography
                                                    variant="caption"
                                                    sx={{ color: p.ink3 }}
                                                >
                                                    {opt.description}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontWeight: 600,
                                            color: p.indigo,
                                            fontFamily: MONO,
                                        }}
                                    >
                                        {formatPrice(price)}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                </Box>
            );
        }

        case "textarea":
            return (
                <TextField
                    label={`${field.label}${field.required ? " *" : ""}`}
                    placeholder={field.placeholder}
                    multiline
                    rows={4}
                    fullWidth
                    disabled
                    sx={builderFieldSx}
                />
            );

        default:
            return (
                <TextField
                    label={`${field.label}${field.required ? " *" : ""}`}
                    placeholder={field.placeholder}
                    type={
                        field.type === "email"
                            ? "email"
                            : field.type === "number"
                              ? "number"
                              : field.type === "date" ||
                                  field.type === "birth_date"
                                ? "date"
                                : "text"
                    }
                    fullWidth
                    disabled
                    sx={builderFieldSx}
                    InputLabelProps={
                        field.type === "date" || field.type === "birth_date"
                            ? { shrink: true }
                            : undefined
                    }
                />
            );
    }
}
