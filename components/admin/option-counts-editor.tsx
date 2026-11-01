"use client";

import { useState } from "react";
import {
    Alert,
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    Typography,
} from "@mui/material";
import { Edit, Save } from "@mui/icons-material";
import type { InputField, OptionCounts } from "@/lib/types/registration-form";
import { saveShowOptionCounts } from "@/lib/actions/show-option-counts";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

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

const capSx = {
    fontSize: 11,
    color: p.ink3,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 600,
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

const checkboxSx = {
    color: p.ink3,
    "&.Mui-checked": { color: p.indigo },
} as const;

interface OptionCountsEditorProps {
    yearId: string;
    showOptionCounts: string[];
    allInputFields: InputField[];
    optionCounts?: OptionCounts;
}

/** Get option values for a field — from field.options or from optionCounts keys */
function getFieldOptions(
    field: InputField,
    optionCounts?: OptionCounts
): string[] {
    if (field.options && field.options.length > 0) {
        return field.options;
    }
    // Fallback for pricing_select or fields without explicit options: use optionCounts keys
    if (optionCounts?.[field.name]) {
        return Object.keys(optionCounts[field.name]);
    }
    return [];
}

/** Render a vertical list of option counts for a field */
function OptionCountsList({
    field,
    optionCounts,
}: {
    field: InputField;
    optionCounts?: OptionCounts;
}) {
    const options = getFieldOptions(field, optionCounts);
    if (options.length === 0) return null;

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
            {options.map((option) => {
                const count = optionCounts?.[field.name]?.[option] ?? 0;
                return (
                    <Box
                        key={option}
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            px: 1,
                            py: 0.5,
                        }}
                    >
                        <Typography
                            sx={{ fontSize: "0.875rem", color: p.ink3 }}
                        >
                            {option}
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: "0.875rem",
                                fontFamily: MONO,
                                fontWeight: 500,
                                color: p.ink,
                            }}
                        >
                            {count}&times;
                        </Typography>
                    </Box>
                );
            })}
        </Box>
    );
}

export function OptionCountsEditor({
    yearId,
    showOptionCounts: initialCounts,
    allInputFields,
    optionCounts,
}: OptionCountsEditorProps) {
    const [selected, setSelected] = useState<string[]>(initialCounts);
    const [saved, setSaved] = useState<string[]>(initialCounts);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Only fields with options (select, radio, pricing_select, pricing_multi_select)
    const eligibleFields = allInputFields.filter(
        (f) =>
            f.type === "select" ||
            f.type === "radio" ||
            f.type === "pricing_select" ||
            f.type === "pricing_multi_select"
    );

    const getFieldLabel = (fieldId: string) => {
        return (
            eligibleFields.find((f) => f.id === fieldId)?.label ??
            "(neznámé pole)"
        );
    };

    const getFieldById = (fieldId: string) => {
        return eligibleFields.find((f) => f.id === fieldId);
    };

    const handleToggle = (fieldId: string) => {
        setSelected((prev) =>
            prev.includes(fieldId)
                ? prev.filter((id) => id !== fieldId)
                : [...prev, fieldId]
        );
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSuccess(false);

        const result = await saveShowOptionCounts(yearId, selected);

        if (result.error) {
            setError(result.error);
        } else {
            setSaved(selected);
            setEditing(false);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        }
        setSaving(false);
    };

    const handleCancel = () => {
        setSelected(saved);
        setEditing(false);
        setError(null);
    };

    // --- Read-only view ---
    if (!editing) {
        return (
            <Box sx={paneSx}>
                <Box sx={paneHeadSx}>
                    <Typography sx={kickerSx}>
                        Zobrazení počtů registrací
                    </Typography>
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
                                mb: 2,
                                borderRadius: "12px",
                                backgroundColor: p.value,
                                color: p.valueInk,
                                "& .MuiAlert-message": { color: p.valueInk },
                            }}
                        >
                            Nastavení bylo uloženo
                        </Alert>
                    )}

                    {saved.length === 0 ? (
                        <Typography sx={{ color: p.ink3, py: 1 }}>
                            Počty registrací se u žádného pole nezobrazují.
                        </Typography>
                    ) : (
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 2,
                            }}
                        >
                            {saved.map((fieldId) => {
                                const field = getFieldById(fieldId);
                                return (
                                    <Box
                                        key={fieldId}
                                        sx={{
                                            backgroundColor: p.surface,
                                            border: `1px solid ${p.line}`,
                                            borderRadius: "12px",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                px: 2,
                                                py: 1.25,
                                                borderBottom: `1px solid ${p.line}`,
                                                background: `linear-gradient(180deg, ${p.surface}, ${p.surface2})`,
                                            }}
                                        >
                                            <Typography sx={capSx}>
                                                {getFieldLabel(fieldId)}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ p: 2 }}>
                                            {field ? (
                                                <OptionCountsList
                                                    field={field}
                                                    optionCounts={optionCounts}
                                                />
                                            ) : (
                                                <Typography
                                                    sx={{
                                                        fontSize: "0.875rem",
                                                        color: p.ink3,
                                                    }}
                                                >
                                                    Pole nebylo nalezeno
                                                </Typography>
                                            )}
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
                <Typography sx={kickerSx}>
                    Zobrazení počtů registrací
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                    <Button onClick={handleCancel} size="small" sx={ghostBtnSx}>
                        Zrušit
                    </Button>
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
                    Vyberte pole, u kterých se na veřejné stránce zobrazí
                    aktuální počet registrací u každé možnosti. Počty jsou pouze
                    informativní a neblokují výběr.
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

                {eligibleFields.length === 0 ? (
                    <Alert
                        icon={false}
                        sx={{
                            borderRadius: "12px",
                            backgroundColor: p.field,
                            color: p.fieldInk,
                            "& .MuiAlert-message": { color: p.fieldInk },
                        }}
                    >
                        Formulář neobsahuje žádná pole s možnostmi (výběr,
                        přepínač, cenový výběr).
                    </Alert>
                ) : (
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.5,
                        }}
                    >
                        {eligibleFields.map((field) => (
                            <Box key={field.id}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={selected.includes(
                                                field.id
                                            )}
                                            onChange={() =>
                                                handleToggle(field.id)
                                            }
                                            sx={checkboxSx}
                                        />
                                    }
                                    label={
                                        <Typography
                                            sx={{
                                                fontSize: "0.875rem",
                                                color: p.ink,
                                            }}
                                        >
                                            {field.label}
                                        </Typography>
                                    }
                                />
                                {selected.includes(field.id) && (
                                    <Box sx={{ ml: 4, mb: 1 }}>
                                        <OptionCountsList
                                            field={field}
                                            optionCounts={optionCounts}
                                        />
                                    </Box>
                                )}
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>
        </Box>
    );
}
