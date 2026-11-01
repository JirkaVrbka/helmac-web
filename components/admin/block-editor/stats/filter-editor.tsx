"use client";

import {
    Box,
    Chip,
    MenuItem,
    TextField,
    Typography,
    IconButton,
} from "@mui/material";
import { Add, Close, FilterList } from "@mui/icons-material";
import { useState } from "react";
import type { StatFilter } from "@/lib/types/content-blocks";
import { useRegistrationFields } from "./hooks";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

const chipSx = (selected: boolean) => ({
    fontSize: "0.65rem",
    height: 22,
    borderRadius: "20px",
    ...(selected
        ? {
              backgroundColor: p.indigo,
              color: "#fff",
              border: `1px solid ${p.indigo}`,
              "&:hover": { backgroundColor: p.indigo },
          }
        : {
              backgroundColor: p.surface,
              color: p.ink2,
              border: `1px solid ${p.line}`,
              "&:hover": { backgroundColor: p.surface2 },
          }),
});

const STATUS_OPTIONS = [
    { value: "PENDING", label: "Čeká" },
    { value: "CONFIRMED", label: "Potvrzeno" },
    { value: "WAITLIST", label: "Čekací listina" },
    { value: "CANCELLED", label: "Zrušeno" },
    { value: "REJECTED", label: "Zamítnuto" },
];

interface StatFilterEditorProps {
    filter?: StatFilter;
    onChange: (filter: StatFilter | undefined) => void;
    yearId?: string;
}

export function StatFilterEditor({
    filter,
    onChange,
    yearId,
}: StatFilterEditorProps) {
    const fields = useRegistrationFields(yearId);
    const [expanded, setExpanded] = useState(
        !!filter &&
            (!!filter.statuses?.length ||
                filter.isPaid !== undefined ||
                !!filter.fieldFilters?.length)
    );

    const hasFilter =
        filter &&
        (!!filter.statuses?.length ||
            filter.isPaid !== undefined ||
            !!filter.fieldFilters?.length);

    if (!expanded) {
        return (
            <Box
                onClick={() => setExpanded(true)}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    cursor: "pointer",
                    color: hasFilter ? p.indigo : p.ink3,
                    fontSize: "0.7rem",
                    "&:hover": {
                        color: hasFilter ? p.indigo : p.ink2,
                    },
                }}
            >
                <FilterList sx={{ fontSize: 14 }} />
                <Typography variant="caption" sx={{ fontSize: "0.7rem" }}>
                    {hasFilter ? "Filtr aktivní" : "Přidat filtr"}
                </Typography>
            </Box>
        );
    }

    const f = filter ?? {};

    const toggleStatus = (status: string) => {
        const current = f.statuses ?? [];
        const next = current.includes(status)
            ? current.filter((s) => s !== status)
            : [...current, status];
        onChange({
            ...f,
            statuses: next.length > 0 ? next : undefined,
        });
    };

    const setPaid = (val: boolean | undefined) => {
        onChange({ ...f, isPaid: val });
    };

    const addFieldFilter = () => {
        if (!fields?.length) return;
        const ff = f.fieldFilters ?? [];
        const field = fields[0];
        onChange({
            ...f,
            fieldFilters: [
                ...ff,
                {
                    fieldName: field.name,
                    value: field.options?.[0] ?? "",
                },
            ],
        });
    };

    const removeFieldFilter = (index: number) => {
        const ff = [...(f.fieldFilters ?? [])];
        ff.splice(index, 1);
        onChange({
            ...f,
            fieldFilters: ff.length > 0 ? ff : undefined,
        });
    };

    const updateFieldFilter = (
        index: number,
        key: "fieldName" | "value",
        val: string
    ) => {
        const ff = [...(f.fieldFilters ?? [])];
        ff[index] = { ...ff[index], [key]: val };
        if (key === "fieldName") {
            const field = fields?.find((fd) => fd.name === val);
            ff[index].value = field?.options?.[0] ?? "";
        }
        onChange({ ...f, fieldFilters: ff });
    };

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                gap: 0.75,
                border: `1px solid ${p.line}`,
                borderRadius: "10px",
                p: 0.75,
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <Typography
                    variant="caption"
                    sx={{
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        color: p.ink,
                    }}
                >
                    Filtr
                </Typography>
                <Box sx={{ display: "flex", gap: 0.5 }}>
                    {hasFilter && (
                        <Typography
                            variant="caption"
                            onClick={() => onChange(undefined)}
                            sx={{
                                fontSize: "0.65rem",
                                cursor: "pointer",
                                color: p.ink3,
                                "&:hover": {
                                    color: p.negInk,
                                },
                            }}
                        >
                            Smazat
                        </Typography>
                    )}
                    <IconButton
                        size="small"
                        onClick={() => setExpanded(false)}
                        sx={{
                            p: 0.25,
                            borderRadius: "8px",
                            color: p.ink3,
                            transition: "all 140ms ease",
                            "&:hover": {
                                color: p.indigo,
                                backgroundColor: p.indigoSoft,
                            },
                        }}
                    >
                        <Close sx={{ fontSize: 14 }} />
                    </IconButton>
                </Box>
            </Box>

            <Box>
                <Typography
                    variant="caption"
                    sx={{ fontSize: "0.65rem", color: p.ink2 }}
                >
                    Stav registrace
                </Typography>
                <Box
                    sx={{
                        display: "flex",
                        gap: 0.5,
                        flexWrap: "wrap",
                        mt: 0.25,
                    }}
                >
                    {STATUS_OPTIONS.map((s) => {
                        const selected = f.statuses?.includes(s.value) ?? false;
                        return (
                            <Chip
                                key={s.value}
                                label={s.label}
                                size="small"
                                variant={selected ? "filled" : "outlined"}
                                onClick={() => toggleStatus(s.value)}
                                sx={chipSx(selected)}
                            />
                        );
                    })}
                </Box>
            </Box>

            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                }}
            >
                <Typography
                    variant="caption"
                    sx={{ fontSize: "0.65rem", color: p.ink2 }}
                >
                    Platba:
                </Typography>
                {(
                    [
                        {
                            val: undefined,
                            label: "Vše",
                        },
                        { val: true, label: "Zaplaceno" },
                        {
                            val: false,
                            label: "Nezaplaceno",
                        },
                    ] as const
                ).map((opt) => {
                    const selected = f.isPaid === opt.val;
                    return (
                        <Chip
                            key={String(opt.val)}
                            label={opt.label}
                            size="small"
                            variant={selected ? "filled" : "outlined"}
                            onClick={() => setPaid(opt.val)}
                            sx={chipSx(selected)}
                        />
                    );
                })}
            </Box>

            {fields && fields.length > 0 && (
                <Box>
                    <Typography
                        variant="caption"
                        sx={{
                            fontSize: "0.65rem",
                            mb: 0.25,
                            display: "block",
                            color: p.ink2,
                        }}
                    >
                        Hodnota pole
                    </Typography>
                    {f.fieldFilters?.map((ff, i) => {
                        const field = fields.find(
                            (fd) => fd.name === ff.fieldName
                        );
                        return (
                            <Box
                                key={i}
                                sx={{
                                    display: "flex",
                                    gap: 0.5,
                                    alignItems: "center",
                                    mb: 0.5,
                                }}
                            >
                                <TextField
                                    select
                                    value={ff.fieldName}
                                    onChange={(e) =>
                                        updateFieldFilter(
                                            i,
                                            "fieldName",
                                            e.target.value
                                        )
                                    }
                                    size="small"
                                    sx={{
                                        flex: 1,
                                        ...builderFieldSx,
                                        "& .MuiInputBase-root": {
                                            fontSize: "0.75rem",
                                        },
                                    }}
                                >
                                    {fields
                                        .filter((fd) => fd.options)
                                        .map((fd) => (
                                            <MenuItem
                                                key={fd.name}
                                                value={fd.name}
                                            >
                                                {fd.label}
                                            </MenuItem>
                                        ))}
                                </TextField>
                                <TextField
                                    select
                                    value={ff.value}
                                    onChange={(e) =>
                                        updateFieldFilter(
                                            i,
                                            "value",
                                            e.target.value
                                        )
                                    }
                                    size="small"
                                    sx={{
                                        flex: 1,
                                        ...builderFieldSx,
                                        "& .MuiInputBase-root": {
                                            fontSize: "0.75rem",
                                        },
                                    }}
                                >
                                    {(field?.options ?? []).map((opt) => (
                                        <MenuItem key={opt} value={opt}>
                                            {opt}
                                        </MenuItem>
                                    ))}
                                </TextField>
                                <IconButton
                                    size="small"
                                    onClick={() => removeFieldFilter(i)}
                                    sx={{
                                        p: 0.25,
                                        borderRadius: "8px",
                                        color: p.ink3,
                                        transition: "all 140ms ease",
                                        "&:hover": {
                                            color: p.negInk,
                                            backgroundColor: p.neg,
                                        },
                                    }}
                                >
                                    <Close
                                        sx={{
                                            fontSize: 14,
                                        }}
                                    />
                                </IconButton>
                            </Box>
                        );
                    })}
                    <Chip
                        label="Přidat"
                        size="small"
                        icon={<Add sx={{ fontSize: 14 }} />}
                        onClick={addFieldFilter}
                        variant="outlined"
                        sx={{
                            fontSize: "0.65rem",
                            height: 22,
                            borderRadius: "20px",
                            backgroundColor: p.surface,
                            color: p.indigo,
                            border: `1px dashed ${p.line}`,
                            "& .MuiChip-icon": { color: p.indigo },
                            "&:hover": {
                                backgroundColor: p.indigoSoft,
                                borderColor: p.indigo,
                            },
                        }}
                    />
                </Box>
            )}
        </Box>
    );
}
