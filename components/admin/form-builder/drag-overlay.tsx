"use client";

import { Box, Paper, Typography } from "@mui/material";
import { AccountTree } from "@mui/icons-material";
import {
    FIELD_TYPE_META,
    type FieldType,
    type FormCondition,
    type FormField,
    type PricingDefinition,
} from "@/lib/types/registration-form";
import { FIELD_TYPE_ICONS } from "./field-type-icons";
import { findFlatFieldById } from "./form-builder-helpers";
import type { FlatElement } from "./form-data-adapter";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

const OVERLAY_SHADOW = "0 8px 24px rgba(0,0,0,0.15)";

// Maps the legacy MUI semantic color names used by the palette chips to
// builder-palette accent tokens (border + icon color).
const CHIP_ACCENT: Record<string, string> = {
    primary: p.indigo,
    info: p.fieldInk,
    success: p.valueInk,
};

interface Props {
    activeId: string | null;
    elements: FlatElement[];
    conditions: FormCondition[];
    pricingDefinitions: PricingDefinition[];
}

export function DragOverlayContent({
    activeId,
    elements,
    conditions,
    pricingDefinitions,
}: Props) {
    if (!activeId) return null;

    if (activeId.startsWith("palette-pricing-")) {
        const def = pricingDefinitions.find(
            (d) => d.id === activeId.slice("palette-pricing-".length)
        );
        const isQuantity = def?.type === "quantity";
        const isMulti = !isQuantity && def?.multiSelect;
        const color = isQuantity ? "info" : isMulti ? "primary" : "success";
        const icon = isQuantity
            ? "Calculate"
            : isMulti
              ? "PlaylistAddCheck"
              : "Sell";
        return (
            <PaletteChip
                color={color}
                icon={icon}
                label={def?.name ?? "Ceník"}
            />
        );
    }

    if (activeId.startsWith("palette-condition-")) {
        const cond = conditions.find(
            (c) => c.id === activeId.slice("palette-condition-".length)
        );
        return (
            <PaletteChip
                color="info"
                icon="AccountTree"
                label={cond?.name ?? "Podmínka"}
            />
        );
    }

    if (activeId.startsWith("palette-")) {
        const type = activeId.slice("palette-".length) as FieldType;
        const meta = FIELD_TYPE_META[type];
        return (
            <PaletteChip color="primary" icon={meta.icon} label={meta.label} />
        );
    }

    const field = findFlatFieldById(elements, activeId);
    if (field) {
        const meta = FIELD_TYPE_META[field.type];
        return (
            <Paper
                elevation={0}
                sx={{
                    p: 1.5,
                    backgroundColor: p.surface,
                    border: `1px solid ${p.indigo}`,
                    borderRadius: "12px",
                    boxShadow: OVERLAY_SHADOW,
                }}
            >
                <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{ color: p.ink }}
                >
                    {meta.label}: {"label" in field ? field.label : field.text}
                </Typography>
            </Paper>
        );
    }

    const block = elements.find(
        (el) => el.kind === "block" && el.data.id === activeId
    );
    if (block && block.kind === "block") {
        const cond = conditions.find((c) => c.id === block.data.conditionId);
        const children = elements
            .filter(
                (el) =>
                    el.kind === "field" &&
                    el.data.parentBlockId === block.data.id
            )
            .map((el) => (el.kind === "field" ? el.data.field : null))
            .filter((f): f is FormField => f !== null);
        return (
            <Paper
                elevation={0}
                sx={{
                    border: `1px solid ${p.line}`,
                    borderLeftWidth: "4px",
                    borderLeftColor: p.fieldInk,
                    backgroundColor: p.surface2,
                    borderRadius: "12px",
                    boxShadow: OVERLAY_SHADOW,
                    overflow: "hidden",
                    minWidth: 360,
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        px: 2,
                        py: 1,
                    }}
                >
                    <AccountTree fontSize="small" sx={{ color: p.fieldInk }} />
                    <Typography
                        variant="body2"
                        fontWeight={600}
                        sx={{ color: p.ink }}
                    >
                        Podmínka: {cond?.name ?? "(nepojmenovaná)"}
                    </Typography>
                </Box>
                {children.map((f) => {
                    const meta = FIELD_TYPE_META[f.type];
                    return (
                        <Paper
                            key={f.id}
                            elevation={0}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                mx: 1,
                                mb: 0.5,
                                px: 1.5,
                                py: 1,
                                border: `1px solid ${p.line}`,
                                borderRadius: "10px",
                                backgroundColor: p.surface,
                            }}
                        >
                            <Box
                                sx={{
                                    color: p.ink3,
                                    display: "flex",
                                }}
                            >
                                {FIELD_TYPE_ICONS[meta.icon]}
                            </Box>
                            <Typography
                                variant="body2"
                                sx={{ flex: 1, color: p.ink }}
                            >
                                {"label" in f ? f.label : f.text}
                            </Typography>
                        </Paper>
                    );
                })}
            </Paper>
        );
    }

    return null;
}

function PaletteChip({
    color,
    icon,
    label,
}: {
    color: string;
    icon: string;
    label: string;
}) {
    const accent = CHIP_ACCENT[color] ?? p.indigo;
    return (
        <Paper
            elevation={0}
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1.5,
                py: 1,
                backgroundColor: p.surface,
                border: `1px solid ${accent}`,
                borderRadius: "10px",
                boxShadow: OVERLAY_SHADOW,
                width: 200,
            }}
        >
            <Box sx={{ color: accent, display: "flex" }}>
                {FIELD_TYPE_ICONS[icon]}
            </Box>
            <Typography variant="body2" sx={{ color: p.ink }}>
                {label}
            </Typography>
        </Paper>
    );
}
