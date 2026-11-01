"use client";

import { useState, type ReactNode } from "react";
import {
    Box,
    ButtonBase,
    Button,
    Collapse,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    FormControlLabel,
    IconButton,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import {
    Add,
    Delete,
    ExpandMore,
    ExpandLess,
    Sell,
    Calculate,
    PlaylistAddCheck,
    CategoryOutlined,
    CalendarTodayOutlined,
    WarningAmberOutlined,
} from "@mui/icons-material";
import dayjs from "dayjs";
import type {
    PricingDefinition,
    PricedOption,
    FormElement,
} from "@/lib/types/registration-form";
import { isConditionBlock } from "@/lib/types/registration-form";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

// Builder-palette primitives (local to the form builder).

const MONO = "'JetBrains Mono', monospace";

const kickerSx = {
    fontSize: 11,
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    fontWeight: 700,
    color: p.ink3,
};

const iconBtnDangerSx = {
    color: p.ink3,
    borderRadius: "8px",
    transition: "all 140ms ease",
    "&:hover": { color: p.negInk, backgroundColor: p.neg },
};

const paneSx = {
    backgroundColor: p.surface,
    border: `1px solid ${p.line}`,
    borderRadius: "14px",
    overflow: "hidden",
};

const dashedSx = {
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
    "&:hover": { borderColor: p.indigo, backgroundColor: p.indigoSoft },
};

/** Indigo-on switch. */
const switchSx = {
    "& .MuiSwitch-switchBase": { color: "white" },
    "& .MuiSwitch-switchBase.Mui-checked": { color: "white" },
    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
        backgroundColor: p.indigo,
        opacity: 1,
    },
    "& .MuiSwitch-track": { backgroundColor: p.surface3, opacity: 1 },
};

interface PricingEditorProps {
    pricingDefinitions: PricingDefinition[];
    priceTiers: string[];
    onPriceTiersChange: (tiers: string[]) => void;
    elements: FormElement[];
    onChange: (definitions: PricingDefinition[]) => void;
}

interface BlockInfo {
    definitionName: string;
    fieldCount: number;
}

export function PricingEditor({
    pricingDefinitions,
    priceTiers,
    onPriceTiersChange,
    elements,
    onChange,
}: PricingEditorProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [blockInfo, setBlockInfo] = useState<BlockInfo | null>(null);

    // Check if a pricing definition is referenced by any pricing field
    const getFieldsUsingDefinition = (definitionId: string): number => {
        let count = 0;
        for (const el of elements) {
            if (isConditionBlock(el)) {
                for (const child of el.children) {
                    if (
                        (child.type === "pricing_select" ||
                            child.type === "pricing_quantity" ||
                            child.type === "pricing_multi_select") &&
                        "pricingId" in child &&
                        child.pricingId === definitionId
                    ) {
                        count++;
                    }
                }
            } else if (
                (el.type === "pricing_select" ||
                    el.type === "pricing_quantity" ||
                    el.type === "pricing_multi_select") &&
                "pricingId" in el &&
                el.pricingId === definitionId
            ) {
                count++;
            }
        }
        return count;
    };

    // --- Shared tier handlers ---

    const handleAddTier = () => {
        const newTiers = [...priceTiers, ""];
        onPriceTiersChange(newTiers);
        // Add a price slot for each definition using tiers
        onChange(
            pricingDefinitions.map((d) => {
                if (!d.usePriceTiers) return d;
                const newOptions = d.options.map((opt) => {
                    const prices = [...opt.prices];
                    // Insert a 0 before the fallback (last element)
                    prices.splice(prices.length - 1, 0, 0);
                    return { ...opt, prices };
                });
                return { ...d, options: newOptions };
            })
        );
    };

    const handleRemoveTier = (tierIndex: number) => {
        const newTiers = priceTiers.filter((_, i) => i !== tierIndex);
        onPriceTiersChange(newTiers);
        // Remove corresponding price slot from definitions using tiers
        onChange(
            pricingDefinitions.map((d) => {
                if (!d.usePriceTiers) return d;
                const newOptions = d.options.map((opt) => {
                    const prices = opt.prices.filter((_, i) => i !== tierIndex);
                    return { ...opt, prices };
                });
                return { ...d, options: newOptions };
            })
        );
    };

    const handleUpdateTier = (tierIndex: number, value: string) => {
        const newTiers = [...priceTiers];
        newTiers[tierIndex] = value;
        onPriceTiersChange(newTiers);
    };

    // --- Definition handlers ---

    const handleAddDefinition = (
        type?: "options" | "quantity",
        multiSelect?: boolean
    ) => {
        const newDef: PricingDefinition = {
            id: crypto.randomUUID(),
            name: "",
            type: type,
            multiSelect: multiSelect,
            usePriceTiers: false,
            options: [
                {
                    id: crypto.randomUUID(),
                    name: "",
                    description: "",
                    prices: [0], // single flat price
                },
            ],
        };
        onChange([...pricingDefinitions, newDef]);
        setExpandedId(newDef.id);
    };

    const handleUpdateDefinition = (
        id: string,
        updates: Partial<PricingDefinition>
    ) => {
        onChange(
            pricingDefinitions.map((d) =>
                d.id === id ? { ...d, ...updates } : d
            )
        );
    };

    const handleDeleteDefinition = (id: string) => {
        const fieldCount = getFieldsUsingDefinition(id);
        if (fieldCount > 0) {
            const def = pricingDefinitions.find((d) => d.id === id);
            setBlockInfo({
                definitionName: def?.name || "(nepojmenovaná)",
                fieldCount,
            });
            return;
        }
        onChange(pricingDefinitions.filter((d) => d.id !== id));
        if (expandedId === id) setExpandedId(null);
    };

    const handleToggleUsePriceTiers = (
        definitionId: string,
        useTiers: boolean
    ) => {
        onChange(
            pricingDefinitions.map((d) => {
                if (d.id !== definitionId) return d;
                if (useTiers) {
                    // Expand prices from [flat] to [tier1, tier2, ..., fallback]
                    const newOptions = d.options.map((opt) => {
                        const flatPrice = opt.prices[0] ?? 0;
                        const prices = new Array(priceTiers.length).fill(
                            flatPrice
                        );
                        prices.push(flatPrice); // fallback
                        return { ...opt, prices };
                    });
                    return { ...d, usePriceTiers: true, options: newOptions };
                } else {
                    // Collapse prices to [fallback]
                    const newOptions = d.options.map((opt) => {
                        const fallback = opt.prices[opt.prices.length - 1] ?? 0;
                        return { ...opt, prices: [fallback] };
                    });
                    return { ...d, usePriceTiers: false, options: newOptions };
                }
            })
        );
    };

    const handleAddOption = (definitionId: string) => {
        onChange(
            pricingDefinitions.map((d) => {
                if (d.id !== definitionId) return d;
                const priceCount = d.usePriceTiers ? priceTiers.length + 1 : 1;
                const newOption: PricedOption = {
                    id: crypto.randomUUID(),
                    name: "",
                    description: "",
                    prices: new Array(priceCount).fill(0),
                };
                return { ...d, options: [...d.options, newOption] };
            })
        );
    };

    const handleUpdateOption = (
        definitionId: string,
        optionId: string,
        updates: Partial<PricedOption>
    ) => {
        onChange(
            pricingDefinitions.map((d) => {
                if (d.id !== definitionId) return d;
                return {
                    ...d,
                    options: d.options.map((o) =>
                        o.id === optionId ? { ...o, ...updates } : o
                    ),
                };
            })
        );
    };

    const handleUpdateOptionPrice = (
        definitionId: string,
        optionId: string,
        priceIndex: number,
        value: number
    ) => {
        onChange(
            pricingDefinitions.map((d) => {
                if (d.id !== definitionId) return d;
                return {
                    ...d,
                    options: d.options.map((o) => {
                        if (o.id !== optionId) return o;
                        const newPrices = [...o.prices];
                        newPrices[priceIndex] = value;
                        return { ...o, prices: newPrices };
                    }),
                };
            })
        );
    };

    const handleDeleteOption = (definitionId: string, optionId: string) => {
        onChange(
            pricingDefinitions.map((d) => {
                if (d.id !== definitionId) return d;
                return {
                    ...d,
                    options: d.options.filter((o) => o.id !== optionId),
                };
            })
        );
    };

    // Stats
    const totalGroups = pricingDefinitions.length;
    const [today] = useState(() => {
        const now = new Date();
        return {
            date: now.toISOString().split("T")[0],
            twoWeeks: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
        };
    });
    const totalActiveTiers = priceTiers.filter(
        (t) => t && t >= today.date
    ).length;
    const expiringTiers = priceTiers.filter(
        (t) => t && t >= today.date && t <= today.twoWeeks
    ).length;

    // Price field "Kč" adornment
    const kcAdornment = (
        <Typography
            variant="caption"
            sx={{ color: p.valueInk, fontWeight: 600 }}
        >
            Kč
        </Typography>
    );
    const priceFieldSx = { ...builderFieldSx, width: 130 };

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
                Ceník
            </Typography>
            <Typography variant="body2" sx={{ color: p.ink2, mb: 2 }}>
                Definujte cenové skupiny s termínovými slevami. Poté je
                přetáhněte z palety do formuláře.
            </Typography>

            {/* Shared price tiers section */}
            <Box sx={{ ...paneSx, p: 2.5, mb: 3 }}>
                <Typography
                    sx={{
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        color: p.ink,
                        mb: 0.5,
                    }}
                >
                    Cenové termíny (sdílené)
                </Typography>
                <Typography
                    variant="caption"
                    sx={{ color: p.ink2, mb: 1.5, display: "block" }}
                >
                    Termíny platí pro všechny cenové skupiny, které je
                    používají. Ceny platí do uvedeného data. Po posledním
                    termínu platí cena &bdquo;na místě&ldquo;.
                </Typography>

                {priceTiers.length > 0 && (
                    <Box
                        sx={{
                            display: "flex",
                            gap: 1,
                            flexWrap: "wrap",
                            mb: 1,
                        }}
                    >
                        {priceTiers.map((tier, idx) => (
                            <Box
                                key={idx}
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                    p: 1,
                                    border: `1px solid ${p.lineSoft}`,
                                    borderRadius: "10px",
                                    backgroundColor: p.surface2,
                                    flex: "1 1 auto",
                                    minWidth: 180,
                                }}
                            >
                                <Typography
                                    variant="body2"
                                    sx={{
                                        minWidth: 60,
                                        fontWeight: 600,
                                        color: p.ink2,
                                    }}
                                >
                                    Termín {idx + 1}
                                </Typography>
                                <DatePicker
                                    value={tier ? dayjs(tier) : null}
                                    onChange={(v) =>
                                        handleUpdateTier(
                                            idx,
                                            v?.format("YYYY-MM-DD") ?? ""
                                        )
                                    }
                                    format="DD.MM.YYYY"
                                    slotProps={{
                                        textField: {
                                            size: "small",
                                            sx: { flex: 1, ...builderFieldSx },
                                        },
                                    }}
                                />
                                <Tooltip title="Odebrat termín">
                                    <IconButton
                                        size="small"
                                        sx={iconBtnDangerSx}
                                        onClick={() => handleRemoveTier(idx)}
                                    >
                                        <Delete fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        ))}
                    </Box>
                )}
                <ButtonBase onClick={handleAddTier} sx={dashedSx}>
                    <Add sx={{ fontSize: 16 }} />
                    Přidat termín
                </ButtonBase>
            </Box>

            {pricingDefinitions.length === 0 && (
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
                    Zatím nejsou definovány žádné cenové skupiny.
                </Box>
            )}

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {pricingDefinitions.map((def) => {
                    const isExpanded = expandedId === def.id;
                    const isQuantity = def.type === "quantity";
                    const isMultiSelect = !isQuantity && def.multiSelect;
                    // Icon-chip background token per pricing type.
                    const typeChipColor = isQuantity
                        ? p.fieldInk
                        : isMultiSelect
                          ? p.indigoInk
                          : p.valueInk;
                    const TypeIcon = isQuantity
                        ? Calculate
                        : isMultiSelect
                          ? PlaylistAddCheck
                          : Sell;
                    const typeLabel = isQuantity
                        ? "Cenový počet"
                        : isMultiSelect
                          ? "Cenový vícevýběr"
                          : "Cenový výběr";
                    return (
                        <Box key={def.id} sx={paneSx}>
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
                                    setExpandedId(isExpanded ? null : def.id)
                                }
                            >
                                <Box
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: "8px",
                                        backgroundColor: typeChipColor,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                    }}
                                >
                                    <TypeIcon
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
                                        {def.name || "(nepojmenovaná)"}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={{ color: p.ink3 }}
                                    >
                                        {typeLabel} · {def.options.length}{" "}
                                        {def.options.length === 1
                                            ? "možnost"
                                            : "možnosti"}
                                        {def.usePriceTiers
                                            ? ` · ${priceTiers.length} ${priceTiers.length === 1 ? "termín" : "termíny"}`
                                            : " · paušální cena"}
                                    </Typography>
                                </Box>
                                {isExpanded ? (
                                    <ExpandLess sx={{ color: p.ink3 }} />
                                ) : (
                                    <ExpandMore sx={{ color: p.ink3 }} />
                                )}
                                <Tooltip title="Smazat cenovou skupinu">
                                    <IconButton
                                        size="small"
                                        sx={iconBtnDangerSx}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteDefinition(def.id);
                                        }}
                                    >
                                        <Delete fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            <Collapse in={isExpanded}>
                                <Box sx={{ p: 2.5 }}>
                                    <TextField
                                        label="Název cenové skupiny"
                                        value={def.name}
                                        onChange={(e) =>
                                            handleUpdateDefinition(def.id, {
                                                name: e.target.value,
                                            })
                                        }
                                        size="small"
                                        fullWidth
                                        sx={{ ...builderFieldSx, mb: 2 }}
                                        placeholder='např. "Ubytování", "Vstupné"'
                                    />

                                    {/* Use price tiers toggle */}
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={def.usePriceTiers}
                                                onChange={(e) =>
                                                    handleToggleUsePriceTiers(
                                                        def.id,
                                                        e.target.checked
                                                    )
                                                }
                                                sx={switchSx}
                                            />
                                        }
                                        label="Použít cenové termíny"
                                        sx={{
                                            mb: 2,
                                            display: "block",
                                            "& .MuiFormControlLabel-label": {
                                                fontSize: "0.875rem",
                                                color: p.ink2,
                                            },
                                        }}
                                    />

                                    {/* Options */}
                                    <Typography sx={{ ...kickerSx, mb: 1 }}>
                                        Možnosti
                                    </Typography>
                                    {def.options.map((option) => (
                                        <Box
                                            key={option.id}
                                            sx={{
                                                p: 1.5,
                                                mb: 1,
                                                border: `1px solid ${p.lineSoft}`,
                                                borderRadius: "10px",
                                                backgroundColor: p.surface2,
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    gap: 1,
                                                    mb: 1,
                                                }}
                                            >
                                                <TextField
                                                    label="Název možnosti"
                                                    value={option.name}
                                                    onChange={(e) =>
                                                        handleUpdateOption(
                                                            def.id,
                                                            option.id,
                                                            {
                                                                name: e.target
                                                                    .value,
                                                            }
                                                        )
                                                    }
                                                    size="small"
                                                    sx={{
                                                        ...builderFieldSx,
                                                        flex: 1,
                                                    }}
                                                />
                                                <Tooltip title="Smazat možnost">
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            sx={iconBtnDangerSx}
                                                            onClick={() =>
                                                                handleDeleteOption(
                                                                    def.id,
                                                                    option.id
                                                                )
                                                            }
                                                            disabled={
                                                                def.options
                                                                    .length <= 1
                                                            }
                                                        >
                                                            <Delete fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            </Box>
                                            <TextField
                                                label="Popis"
                                                value={option.description}
                                                onChange={(e) =>
                                                    handleUpdateOption(
                                                        def.id,
                                                        option.id,
                                                        {
                                                            description:
                                                                e.target.value,
                                                        }
                                                    )
                                                }
                                                size="small"
                                                fullWidth
                                                sx={{
                                                    ...builderFieldSx,
                                                    mb: 1,
                                                }}
                                            />
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    gap: 1,
                                                    flexWrap: "wrap",
                                                }}
                                            >
                                                {def.usePriceTiers ? (
                                                    <>
                                                        {priceTiers.map(
                                                            (tier, tierIdx) => (
                                                                <TextField
                                                                    key={
                                                                        tierIdx
                                                                    }
                                                                    label={`Do ${tier || "?"}`}
                                                                    type="number"
                                                                    value={
                                                                        option
                                                                            .prices[
                                                                            tierIdx
                                                                        ] ?? 0
                                                                    }
                                                                    onChange={(
                                                                        e
                                                                    ) =>
                                                                        handleUpdateOptionPrice(
                                                                            def.id,
                                                                            option.id,
                                                                            tierIdx,
                                                                            Number(
                                                                                e
                                                                                    .target
                                                                                    .value
                                                                            ) ||
                                                                                0
                                                                        )
                                                                    }
                                                                    size="small"
                                                                    sx={
                                                                        priceFieldSx
                                                                    }
                                                                    InputProps={{
                                                                        endAdornment:
                                                                            kcAdornment,
                                                                    }}
                                                                />
                                                            )
                                                        )}
                                                        <TextField
                                                            label="Na místě"
                                                            type="number"
                                                            value={
                                                                option.prices[
                                                                    priceTiers
                                                                        .length
                                                                ] ?? 0
                                                            }
                                                            onChange={(e) =>
                                                                handleUpdateOptionPrice(
                                                                    def.id,
                                                                    option.id,
                                                                    priceTiers.length,
                                                                    Number(
                                                                        e.target
                                                                            .value
                                                                    ) || 0
                                                                )
                                                            }
                                                            size="small"
                                                            sx={priceFieldSx}
                                                            InputProps={{
                                                                endAdornment:
                                                                    kcAdornment,
                                                            }}
                                                        />
                                                    </>
                                                ) : (
                                                    <TextField
                                                        label="Cena"
                                                        type="number"
                                                        value={
                                                            option.prices[0] ??
                                                            0
                                                        }
                                                        onChange={(e) =>
                                                            handleUpdateOptionPrice(
                                                                def.id,
                                                                option.id,
                                                                0,
                                                                Number(
                                                                    e.target
                                                                        .value
                                                                ) || 0
                                                            )
                                                        }
                                                        size="small"
                                                        sx={priceFieldSx}
                                                        InputProps={{
                                                            endAdornment:
                                                                kcAdornment,
                                                        }}
                                                    />
                                                )}
                                            </Box>
                                        </Box>
                                    ))}
                                    <Box sx={{ mt: 0.5 }}>
                                        <ButtonBase
                                            onClick={() =>
                                                handleAddOption(def.id)
                                            }
                                            sx={dashedSx}
                                        >
                                            <Add sx={{ fontSize: 16 }} />
                                            Přidat možnost
                                        </ButtonBase>
                                    </Box>
                                </Box>
                            </Collapse>
                        </Box>
                    );
                })}
            </Box>

            <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
                <Button
                    variant="outlined"
                    startIcon={<Sell sx={{ color: p.valueInk }} />}
                    onClick={() => handleAddDefinition("options", false)}
                    sx={{
                        flex: "1 1 0",
                        minWidth: 200,
                        textTransform: "none",
                        fontWeight: 600,
                        borderRadius: "10px",
                        backgroundColor: p.surface,
                        color: p.ink2,
                        borderColor: p.line,
                        "&:hover": {
                            borderColor: p.ink3,
                            backgroundColor: p.surface2,
                        },
                    }}
                >
                    Přidat cenový výběr
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<PlaylistAddCheck sx={{ color: p.indigoInk }} />}
                    onClick={() => handleAddDefinition("options", true)}
                    sx={{
                        flex: "1 1 0",
                        minWidth: 200,
                        textTransform: "none",
                        fontWeight: 600,
                        borderRadius: "10px",
                        backgroundColor: p.surface,
                        color: p.ink2,
                        borderColor: p.line,
                        "&:hover": {
                            borderColor: p.ink3,
                            backgroundColor: p.surface2,
                        },
                    }}
                >
                    Přidat cenový vícevýběr
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<Calculate sx={{ color: p.fieldInk }} />}
                    onClick={() => handleAddDefinition("quantity", false)}
                    sx={{
                        flex: "1 1 0",
                        minWidth: 200,
                        textTransform: "none",
                        fontWeight: 600,
                        borderRadius: "10px",
                        backgroundColor: p.surface,
                        color: p.ink2,
                        borderColor: p.line,
                        "&:hover": {
                            borderColor: p.ink3,
                            backgroundColor: p.surface2,
                        },
                    }}
                >
                    Přidat cenový počet
                </Button>
            </Box>

            {/* Stats summary */}
            {pricingDefinitions.length > 0 && (
                <Box sx={{ display: "flex", gap: 2, mt: 3, flexWrap: "wrap" }}>
                    <StatTile
                        icon={<CategoryOutlined sx={{ fontSize: 20 }} />}
                        iconBg={p.indigoSoft}
                        iconColor={p.indigo}
                        label="Celkem skupin"
                        value={totalGroups}
                    />
                    <StatTile
                        icon={<CalendarTodayOutlined sx={{ fontSize: 20 }} />}
                        iconBg={p.value}
                        iconColor={p.valueInk}
                        label="Aktivních termínů"
                        value={totalActiveTiers}
                    />
                    <StatTile
                        icon={<WarningAmberOutlined sx={{ fontSize: 20 }} />}
                        iconBg={p.warnSoft}
                        iconColor={p.warnInk}
                        label="Končící termíny"
                        value={expiringTiers}
                    />
                </Box>
            )}

            <Dialog
                open={!!blockInfo}
                onClose={() => setBlockInfo(null)}
                PaperProps={{ sx: { borderRadius: "14px" } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>
                    Nelze smazat cenovou skupinu
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Cenová skupina &bdquo;{blockInfo?.definitionName}&ldquo;
                        je používána v {blockInfo?.fieldCount}{" "}
                        {blockInfo?.fieldCount === 1 ? "poli" : "polích"} ve
                        formuláři. Nejdříve odstraňte všechna pole cenového
                        výběru, která ji používají.
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

/** Builder-palette KPI stat tile. */
function StatTile({
    icon,
    iconBg,
    iconColor,
    label,
    value,
}: {
    icon: ReactNode;
    iconBg: string;
    iconColor: string;
    label: string;
    value: number;
}) {
    return (
        <Box
            sx={{
                backgroundColor: p.surface,
                border: `1px solid ${p.line}`,
                borderRadius: "14px",
                p: 2.25,
                flex: "1 1 0",
                minWidth: 140,
                display: "flex",
                flexDirection: "column",
                gap: 0.75,
            }}
        >
            <Box
                sx={{
                    width: 38,
                    height: 38,
                    borderRadius: "11px",
                    backgroundColor: iconBg,
                    color: iconColor,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {icon}
            </Box>
            <Typography
                sx={{
                    fontFamily: MONO,
                    fontSize: "1.7rem",
                    fontWeight: 700,
                    color: p.ink,
                    lineHeight: 1.1,
                }}
            >
                {value}
            </Typography>
            <Typography sx={{ fontSize: "0.8rem", color: p.ink2 }}>
                {label}
            </Typography>
        </Box>
    );
}
