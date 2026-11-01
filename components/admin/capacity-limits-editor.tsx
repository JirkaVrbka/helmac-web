"use client";

import { useState } from "react";
import {
    Alert,
    Box,
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
import { Add, Delete, Edit, Save } from "@mui/icons-material";
import type {
    CapacityLimit,
    InputField,
    PricingDefinition,
    OptionCounts,
} from "@/lib/types/registration-form";
import { saveCapacityLimits } from "@/lib/actions/capacity-limits";
import { getFieldOptionValues } from "@/lib/utils/pricing";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

const MONO = "'JetBrains Mono', monospace";

const paneSx = {
    backgroundColor: p.surface,
    border: `1px solid ${p.line}`,
    borderRadius: "14px",
    overflow: "hidden",
} as const;

const paneHeadSx = {
    px: 2.5,
    py: 1.75,
    borderBottom: `1px solid ${p.line}`,
    background: `linear-gradient(180deg, ${p.surface}, ${p.surface2})`,
    display: "flex",
    alignItems: "center",
    gap: 1.5,
} as const;

const kickerSx = {
    fontSize: 11,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: p.ink3,
    fontWeight: 700,
    flex: 1,
} as const;

const ghostBtnSx = {
    backgroundColor: p.surface,
    border: `1px solid ${p.line}`,
    color: p.ink2,
    textTransform: "none",
    borderRadius: "10px",
    "&:hover": { borderColor: p.ink3, backgroundColor: p.surface2 },
} as const;

const indigoBtnSx = {
    backgroundColor: p.indigo,
    color: "#fff",
    textTransform: "none",
    borderRadius: "10px",
    boxShadow: "none",
    "&:hover": { backgroundColor: "#4338ca", boxShadow: "none" },
    "&.Mui-disabled": { backgroundColor: p.surface3, color: p.ink3 },
} as const;

interface CapacityLimitsEditorProps {
    yearId: string;
    capacityLimits: CapacityLimit[];
    allInputFields: InputField[];
    pricingDefinitions: PricingDefinition[];
    optionCounts?: OptionCounts;
}

export function CapacityLimitsEditor({
    yearId,
    capacityLimits: initialLimits,
    allInputFields,
    pricingDefinitions,
    optionCounts,
}: CapacityLimitsEditorProps) {
    const [limits, setLimits] = useState<CapacityLimit[]>(initialLimits);
    const [savedLimits, setSavedLimits] =
        useState<CapacityLimit[]>(initialLimits);
    const [editing, setEditing] = useState(initialLimits.length === 0);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Only fields that have options (select, radio, pricing_select, pricing_multi_select, pricing_quantity)
    const eligibleFields = allInputFields.filter(
        (f) =>
            f.type === "select" ||
            f.type === "radio" ||
            f.type === "pricing_select" ||
            f.type === "pricing_multi_select" ||
            f.type === "pricing_quantity"
    );

    const getUnitNameForField = (fieldId: string): string | undefined => {
        const field = eligibleFields.find((f) => f.id === fieldId);
        if (!field || field.type !== "pricing_quantity" || !field.pricingId)
            return undefined;
        return pricingDefinitions.find((d) => d.id === field.pricingId)
            ?.unitName;
    };

    const getFieldLabel = (fieldId: string) => {
        return (
            eligibleFields.find((f) => f.id === fieldId)?.label ??
            "(neznámé pole)"
        );
    };

    const getOptionsForField = (fieldId: string): string[] => {
        const field = eligibleFields.find((f) => f.id === fieldId);
        if (!field) return [];
        return getFieldOptionValues(field, pricingDefinitions);
    };

    const getCurrentCount = (fieldId: string, value: string): number => {
        const field = eligibleFields.find((f) => f.id === fieldId);
        if (!field) return 0;
        return optionCounts?.[field.name]?.[value] ?? 0;
    };

    const handleAdd = () => {
        setLimits((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                fieldId: "",
                value: "",
                maxCount: 10,
            },
        ]);
    };

    const handleUpdate = (id: string, updates: Partial<CapacityLimit>) => {
        setLimits((prev) =>
            prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
        );
    };

    const handleDelete = (id: string) => {
        setLimits((prev) => prev.filter((l) => l.id !== id));
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSuccess(false);

        const validLimits = limits.filter(
            (l) => l.fieldId && l.value && l.maxCount > 0
        );

        const result = await saveCapacityLimits(yearId, validLimits);

        if (result.error) {
            setError(result.error);
        } else {
            setLimits(validLimits);
            setSavedLimits(validLimits);
            setEditing(false);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        }
        setSaving(false);
    };

    const handleCancel = () => {
        setLimits(savedLimits);
        setEditing(false);
        setError(null);
    };

    // --- Read-only view ---
    if (!editing) {
        return (
            <Box sx={paneSx}>
                <Box sx={paneHeadSx}>
                    <Typography sx={kickerSx}>Limity kapacity</Typography>
                    <Button
                        startIcon={<Edit sx={{ fontSize: 16 }} />}
                        onClick={() => setEditing(true)}
                        size="small"
                        sx={ghostBtnSx}
                    >
                        Upravit
                    </Button>
                </Box>

                <Box sx={{ p: 2.5 }}>
                    {success && (
                        <Alert
                            icon={false}
                            sx={{
                                mb: 1.75,
                                borderRadius: "12px",
                                backgroundColor: p.value,
                                color: p.valueInk,
                                "& .MuiAlert-message": { color: p.valueInk },
                            }}
                        >
                            Limity kapacity byly uloženy
                        </Alert>
                    )}

                    {savedLimits.length === 0 ? (
                        <Typography sx={{ color: p.ink3, py: 1 }}>
                            Zatím nejsou nastaveny žádné limity kapacity.
                        </Typography>
                    ) : (
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 1.25,
                            }}
                        >
                            {savedLimits.map((limit) => {
                                const currentCount = getCurrentCount(
                                    limit.fieldId,
                                    limit.value
                                );
                                const ratio =
                                    limit.maxCount > 0
                                        ? currentCount / limit.maxCount
                                        : 0;
                                const isFull = currentCount >= limit.maxCount;
                                const barColor = isFull
                                    ? p.negInk
                                    : ratio >= 0.8
                                      ? p.warnInk
                                      : p.indigo;
                                const unitName = getUnitNameForField(
                                    limit.fieldId
                                );
                                const chipLabel = unitName
                                    ? `${currentCount}/${limit.maxCount} ${unitName}`
                                    : `${currentCount}/${limit.maxCount}`;

                                return (
                                    <Box
                                        key={limit.id}
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1.75,
                                            px: 1.5,
                                            py: 1.25,
                                            borderRadius: "10px",
                                            backgroundColor: p.surface2,
                                            border: `1px solid ${p.lineSoft}`,
                                        }}
                                    >
                                        <Typography
                                            sx={{
                                                flex: 1,
                                                fontSize: "0.9rem",
                                                color: p.ink2,
                                            }}
                                        >
                                            {getFieldLabel(limit.fieldId)}{" "}
                                            <Typography
                                                component="span"
                                                sx={{
                                                    fontSize: "0.9rem",
                                                    fontWeight: 700,
                                                    color: p.ink,
                                                }}
                                            >
                                                {limit.value}
                                            </Typography>
                                        </Typography>

                                        <Box
                                            sx={{
                                                width: 90,
                                                height: 6,
                                                borderRadius: "3px",
                                                backgroundColor: p.surface3,
                                                overflow: "hidden",
                                                flexShrink: 0,
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: `${Math.min(ratio * 100, 100)}%`,
                                                    height: "100%",
                                                    backgroundColor: barColor,
                                                }}
                                            />
                                        </Box>

                                        <Box
                                            sx={{
                                                fontFamily: MONO,
                                                fontSize: 11,
                                                fontWeight: 600,
                                                px: "9px",
                                                py: "3px",
                                                borderRadius: "6px",
                                                whiteSpace: "nowrap",
                                                minWidth: 56,
                                                textAlign: "center",
                                                backgroundColor: isFull
                                                    ? p.neg
                                                    : p.surface3,
                                                color: isFull
                                                    ? p.negInk
                                                    : p.ink2,
                                            }}
                                        >
                                            {chipLabel}
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    )}
                </Box>
            </Box>
        );
    }

    // --- Edit mode ---
    return (
        <Box sx={paneSx}>
            <Box sx={paneHeadSx}>
                <Typography sx={kickerSx}>Limity kapacity</Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                    {savedLimits.length > 0 && (
                        <Button
                            onClick={handleCancel}
                            size="small"
                            sx={ghostBtnSx}
                        >
                            Zrušit
                        </Button>
                    )}
                    <Button
                        variant="contained"
                        startIcon={<Save sx={{ fontSize: 16 }} />}
                        onClick={handleSave}
                        disabled={saving}
                        size="small"
                        sx={indigoBtnSx}
                    >
                        {saving ? "Ukládám..." : "Uložit"}
                    </Button>
                </Box>
            </Box>

            <Box sx={{ p: 2.5 }}>
                <Typography sx={{ mb: 2, fontSize: "0.9rem", color: p.ink2 }}>
                    Nastavte maximální počet registrací pro konkrétní možnosti.
                    Po vyčerpání kapacity bude možnost zobrazena, ale nelze ji
                    vybrat.
                </Typography>

                {error && (
                    <Alert
                        severity="error"
                        sx={{ mb: 2, borderRadius: "12px" }}
                        onClose={() => setError(null)}
                    >
                        {error}
                    </Alert>
                )}

                {limits.length === 0 && (
                    <Typography
                        sx={{ color: p.ink3, textAlign: "center", py: 2 }}
                    >
                        Zatím nejsou nastaveny žádné limity kapacity.
                    </Typography>
                )}

                <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
                >
                    {limits.map((limit) => {
                        const options = getOptionsForField(limit.fieldId);
                        const currentCount =
                            limit.fieldId && limit.value
                                ? getCurrentCount(limit.fieldId, limit.value)
                                : 0;

                        return (
                            <Box
                                key={limit.id}
                                sx={{
                                    backgroundColor: p.surface2,
                                    border: `1px solid ${p.lineSoft}`,
                                    borderRadius: "10px",
                                    p: 1.5,
                                    display: "flex",
                                    gap: 1,
                                    alignItems: "center",
                                    flexWrap: "wrap",
                                }}
                            >
                                <FormControl
                                    size="small"
                                    sx={{
                                        minWidth: 180,
                                        flex: 1,
                                        ...builderFieldSx,
                                    }}
                                >
                                    <InputLabel>Pole</InputLabel>
                                    <Select
                                        value={limit.fieldId}
                                        onChange={(e) =>
                                            handleUpdate(limit.id, {
                                                fieldId: e.target.value,
                                                value: "",
                                            })
                                        }
                                        label="Pole"
                                    >
                                        {eligibleFields.map((f) => (
                                            <MenuItem key={f.id} value={f.id}>
                                                {f.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <FormControl
                                    size="small"
                                    sx={{
                                        minWidth: 160,
                                        flex: 1,
                                        ...builderFieldSx,
                                    }}
                                >
                                    <InputLabel>Možnost</InputLabel>
                                    <Select
                                        value={limit.value}
                                        onChange={(e) =>
                                            handleUpdate(limit.id, {
                                                value: e.target.value,
                                            })
                                        }
                                        label="Možnost"
                                        disabled={!limit.fieldId}
                                    >
                                        {options.map((opt) => (
                                            <MenuItem key={opt} value={opt}>
                                                {opt}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <TextField
                                    label="Max."
                                    type="number"
                                    size="small"
                                    value={limit.maxCount}
                                    onChange={(e) =>
                                        handleUpdate(limit.id, {
                                            maxCount:
                                                parseInt(e.target.value) || 1,
                                        })
                                    }
                                    sx={{ width: 90, ...builderFieldSx }}
                                    inputProps={{ min: 1 }}
                                />

                                {limit.fieldId && limit.value && (
                                    <Typography
                                        sx={{
                                            fontFamily: MONO,
                                            fontSize: "0.85rem",
                                            whiteSpace: "nowrap",
                                            color:
                                                currentCount >= limit.maxCount
                                                    ? p.negInk
                                                    : p.ink3,
                                        }}
                                    >
                                        {currentCount}/{limit.maxCount}
                                    </Typography>
                                )}

                                <Tooltip title="Smazat limit">
                                    <IconButton
                                        size="small"
                                        onClick={() => handleDelete(limit.id)}
                                        sx={{
                                            color: p.ink3,
                                            "&:hover": {
                                                color: p.negInk,
                                                backgroundColor: p.neg,
                                            },
                                        }}
                                    >
                                        <Delete sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        );
                    })}
                </Box>

                <Box
                    onClick={handleAdd}
                    sx={{
                        mt: 2,
                        p: 1.25,
                        backgroundColor: p.surface,
                        border: `1px dashed ${p.line}`,
                        borderRadius: "10px",
                        color: p.indigo,
                        fontSize: 13,
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        cursor: "pointer",
                        transition: "all 140ms ease",
                        "&:hover": {
                            borderColor: p.indigo,
                            backgroundColor: p.indigoSoft,
                        },
                    }}
                >
                    <Add sx={{ fontSize: 16 }} />
                    Přidat limit kapacity
                </Box>

                {eligibleFields.length === 0 && (
                    <Alert
                        icon={false}
                        sx={{
                            mt: 2,
                            borderRadius: "12px",
                            backgroundColor: p.field,
                            color: p.fieldInk,
                            "& .MuiAlert-message": { color: p.fieldInk },
                        }}
                    >
                        Formulář neobsahuje žádná pole s možnostmi (výběr,
                        přepínač, cenový výběr). Nejdříve přidejte taková pole
                        do formuláře.
                    </Alert>
                )}
            </Box>
        </Box>
    );
}
