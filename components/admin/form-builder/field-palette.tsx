"use client";

import { Box, Typography, Paper } from "@mui/material";
import {
    AccountTree,
    Sell,
    Calculate,
    PlaylistAddCheck,
    InfoOutlined,
} from "@mui/icons-material";
import { useDraggable } from "@dnd-kit/core";
import { FieldType, FIELD_TYPE_META } from "@/lib/types/registration-form";
import type {
    FormCondition,
    PricingDefinition,
} from "@/lib/types/registration-form";
import { FIELD_TYPE_ICONS } from "./field-type-icons";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

const categoryLabelSx = {
    fontSize: 11,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: p.ink3,
    fontWeight: 600,
    mb: 1,
} as const;

interface DraggablePaletteItemProps {
    type: FieldType;
    label: string;
    icon: React.ReactNode;
    compact?: boolean;
    onAdd?: (type: FieldType) => void;
}

function DraggablePaletteItem({
    type,
    label,
    icon,
    compact,
    onAdd,
}: DraggablePaletteItemProps) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `palette-${type}`,
        data: { type },
    });

    if (compact) {
        return (
            <Box
                ref={setNodeRef}
                {...attributes}
                {...listeners}
                onClick={() => onAdd?.(type)}
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.75,
                    px: "6px",
                    py: "11px",
                    textAlign: "center",
                    border: `1px solid ${p.line}`,
                    borderRadius: "10px",
                    backgroundColor: p.surface,
                    color: p.ink2,
                    cursor: "grab",
                    opacity: isDragging ? 0.5 : 1,
                    minHeight: 64,
                    transition: "all 140ms ease",
                    "&:hover": {
                        borderColor: p.indigo,
                        backgroundColor: p.indigoSoft,
                    },
                    "&:active": {
                        cursor: "grabbing",
                    },
                }}
            >
                <Box sx={{ color: p.indigo, display: "flex" }}>{icon}</Box>
                <Typography
                    sx={{
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        textAlign: "center",
                    }}
                >
                    {label}
                </Typography>
            </Box>
        );
    }

    return (
        <Box
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            onClick={() => onAdd?.(type)}
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                px: "11px",
                py: "9px",
                border: `1px solid ${p.line}`,
                borderRadius: "10px",
                backgroundColor: p.surface,
                color: p.ink2,
                cursor: "grab",
                opacity: isDragging ? 0.5 : 1,
                transition: "all 140ms ease",
                "&:hover": {
                    borderColor: p.indigo,
                    backgroundColor: p.indigoSoft,
                },
                "&:active": {
                    cursor: "grabbing",
                },
            }}
        >
            <Box sx={{ color: p.indigo, display: "flex" }}>{icon}</Box>
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 600 }}>
                {label}
            </Typography>
        </Box>
    );
}

interface DraggableConditionItemProps {
    condition: FormCondition;
    onAdd?: (conditionId: string) => void;
}

function DraggableConditionItem({
    condition,
    onAdd,
}: DraggableConditionItemProps) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `palette-condition-${condition.id}`,
        data: { type: "condition", conditionId: condition.id },
    });

    return (
        <Box
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            onClick={() => onAdd?.(condition.id)}
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                px: "11px",
                py: "9px",
                border: `1px solid ${p.line}`,
                borderRadius: "10px",
                backgroundColor: p.surface,
                color: p.ink2,
                cursor: "grab",
                opacity: isDragging ? 0.5 : 1,
                transition: "all 140ms ease",
                "&:hover": {
                    borderColor: p.fieldInk,
                    backgroundColor: p.field,
                },
                "&:active": {
                    cursor: "grabbing",
                },
            }}
        >
            <Box sx={{ color: p.fieldInk, display: "flex" }}>
                <AccountTree fontSize="small" />
            </Box>
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 600 }} noWrap>
                {condition.name || "(nepojmenovaná)"}
            </Typography>
        </Box>
    );
}

interface DraggablePricingItemProps {
    definition: PricingDefinition;
    onAdd?: (definitionId: string) => void;
}

function DraggablePricingItem({
    definition,
    onAdd,
}: DraggablePricingItemProps) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `palette-pricing-${definition.id}`,
        data: { type: "pricing", definitionId: definition.id },
    });

    const isQuantity = definition.type === "quantity";
    const isMultiSelect = !isQuantity && definition.multiSelect;
    // Visual accent per pricing kind: quantity → info-blue, multi-select →
    // indigo, single select → success-green.
    const accent = isQuantity
        ? p.fieldInk
        : isMultiSelect
          ? p.indigo
          : p.valueInk;
    const accentHoverBg = isQuantity
        ? p.field
        : isMultiSelect
          ? p.indigoSoft
          : p.value;

    return (
        <Box
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            onClick={() => onAdd?.(definition.id)}
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                px: "11px",
                py: "9px",
                border: `1px solid ${p.line}`,
                borderRadius: "10px",
                backgroundColor: p.surface,
                color: p.ink2,
                cursor: "grab",
                opacity: isDragging ? 0.5 : 1,
                transition: "all 140ms ease",
                "&:hover": {
                    borderColor: accent,
                    backgroundColor: accentHoverBg,
                },
                "&:active": {
                    cursor: "grabbing",
                },
            }}
        >
            <Box sx={{ color: accent, display: "flex" }}>
                {isQuantity ? (
                    <Calculate fontSize="small" />
                ) : isMultiSelect ? (
                    <PlaylistAddCheck fontSize="small" />
                ) : (
                    <Sell fontSize="small" />
                )}
            </Box>
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 600 }} noWrap>
                {definition.name || "(nepojmenovaná)"}
            </Typography>
        </Box>
    );
}

interface FieldPaletteProps {
    conditions?: FormCondition[];
    pricingDefinitions?: PricingDefinition[];
    onAddField?: (type: FieldType) => void;
    onAddConditionBlock?: (conditionId: string) => void;
    onAddPricingField?: (definitionId: string) => void;
}

export function FieldPalette({
    conditions = [],
    pricingDefinitions = [],
    onAddField,
    onAddConditionBlock,
    onAddPricingField,
}: FieldPaletteProps) {
    const inputTypes = Object.entries(FIELD_TYPE_META).filter(
        ([, meta]) => meta.group === "input"
    );
    const layoutTypes = Object.entries(FIELD_TYPE_META).filter(
        ([, meta]) => meta.group === "layout"
    );

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2,
                borderRadius: "14px",
                border: `1px solid ${p.line}`,
                backgroundColor: p.surface,
                position: "sticky",
                top: 16,
            }}
        >
            <Typography sx={categoryLabelSx}>Vstupní pole</Typography>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 1,
                    mb: 2,
                }}
            >
                {inputTypes.map(([type, meta]) => (
                    <DraggablePaletteItem
                        key={type}
                        type={type as FieldType}
                        label={meta.label}
                        icon={FIELD_TYPE_ICONS[meta.icon]}
                        compact
                        onAdd={onAddField}
                    />
                ))}
            </Box>

            <Typography sx={categoryLabelSx}>Rozložení</Typography>
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.75,
                    mb: 2,
                }}
            >
                {layoutTypes.map(([type, meta]) => (
                    <DraggablePaletteItem
                        key={type}
                        type={type as FieldType}
                        label={meta.label}
                        icon={FIELD_TYPE_ICONS[meta.icon]}
                        onAdd={onAddField}
                    />
                ))}
            </Box>

            {conditions.length > 0 && (
                <>
                    <Typography sx={categoryLabelSx}>Podmínky</Typography>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.75,
                            mb: 2,
                        }}
                    >
                        {conditions.map((condition) => (
                            <DraggableConditionItem
                                key={condition.id}
                                condition={condition}
                                onAdd={onAddConditionBlock}
                            />
                        ))}
                    </Box>
                </>
            )}

            {pricingDefinitions.length > 0 && (
                <>
                    <Typography sx={categoryLabelSx}>Ceník</Typography>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.75,
                            mb: 2,
                        }}
                    >
                        {pricingDefinitions.map((def) => (
                            <DraggablePricingItem
                                key={def.id}
                                definition={def}
                                onAdd={onAddPricingField}
                            />
                        ))}
                    </Box>
                </>
            )}

            <Box
                sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1,
                    p: 1.5,
                    borderRadius: "12px",
                    backgroundColor: p.field,
                    color: p.fieldInk,
                }}
            >
                <InfoOutlined
                    sx={{ fontSize: 16, color: p.fieldInk, mt: 0.25 }}
                />
                <Typography variant="caption" sx={{ color: p.fieldInk }}>
                    Klikněte na pole pro přidání na konec, nebo přetáhněte na
                    konkrétní místo.
                </Typography>
            </Box>
        </Paper>
    );
}
