"use client";

import { Box, TextField, Typography } from "@mui/material";
import {
    BUILTIN_METRIC_LABELS,
    BUILTIN_CURRENCY_METRICS,
    FIELD_AGGREGATION_LABELS,
    isBuiltinMetric,
    type StatCardsBlock,
    type BuiltinMetric,
} from "@/lib/types/content-blocks";
import { GameIcon } from "@/lib/icons";
import { IconPicker } from "@/components/admin/icon-picker";
import { formatPrice } from "@/lib/utils/pricing";
import { StatMetricEditor } from "./metric-editor";
import { StatFilterEditor } from "./filter-editor";
import { StatSuffixEditor } from "./suffix-editor";
import { useRegistrationFields, useRegistrationStats } from "./hooks";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

interface StatCardsBlockEditorProps {
    block: StatCardsBlock;
    onChange: (block: StatCardsBlock) => void;
    yearId?: string;
}

export function StatCardsBlockEditor({
    block,
    onChange,
    yearId,
}: StatCardsBlockEditorProps) {
    const fields = useRegistrationFields(yearId);
    const stats = useRegistrationStats(
        yearId,
        block.filter as Record<string, unknown> | undefined
    );
    const source = block.source ?? "builtin";

    const defaultLabel =
        source === "builtin" && isBuiltinMetric(block.metric)
            ? BUILTIN_METRIC_LABELS[block.metric]
            : source === "field"
              ? (fields?.find((f) => f.name === block.metric)?.label ??
                block.metric)
              : block.metric;

    const aggLabel = block.aggregation
        ? FIELD_AGGREGATION_LABELS[block.aggregation]
        : "";
    const placeholder =
        source === "field" && aggLabel
            ? `${defaultLabel} (${aggLabel})`
            : defaultLabel;

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
            }}
        >
            <StatMetricEditor
                value={{
                    id: block.id,
                    source: block.source,
                    metric: block.metric,
                    aggregation: block.aggregation,
                }}
                onChange={(m) =>
                    onChange({
                        ...block,
                        source: m.source,
                        metric: m.metric,
                        aggregation: m.aggregation,
                    })
                }
                yearId={yearId}
            />
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    p: 1,
                }}
            >
                <TextField
                    label="Vlastní popisek"
                    value={block.label ?? ""}
                    onChange={(e) =>
                        onChange({
                            ...block,
                            label: e.target.value || undefined,
                        })
                    }
                    size="small"
                    fullWidth
                    placeholder={placeholder}
                    sx={builderFieldSx}
                />
                <StatSuffixEditor
                    value={block.suffix}
                    onChange={(suffix) => onChange({ ...block, suffix })}
                />
                <StatFilterEditor
                    filter={block.filter}
                    onChange={(f) =>
                        onChange({
                            ...block,
                            filter: f,
                        })
                    }
                    yearId={yearId}
                />
            </Box>

            <Box
                sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    justifyContent: "center",
                    flex: 1,
                    alignContent: "center",
                    py: 1.5,
                    px: 1,
                    backgroundColor: p.surface2,
                    borderTop: `1px solid ${p.line}`,
                }}
            >
                {resolvePreviewCards().map((card, i) => {
                    const cardIcon = block.iconMap?.[card.label] ?? block.icon;
                    return (
                        <Box
                            key={i}
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                px: 1.5,
                                py: 1,
                            }}
                        >
                            <IconPicker
                                value={cardIcon ?? null}
                                onChange={(icon) => {
                                    const map = {
                                        ...(block.iconMap ?? {}),
                                    };
                                    if (icon) {
                                        map[card.label] = icon;
                                    } else {
                                        delete map[card.label];
                                    }
                                    onChange({
                                        ...block,
                                        iconMap:
                                            Object.keys(map).length > 0
                                                ? map
                                                : undefined,
                                    });
                                }}
                                renderTrigger={(onClick, currentIcon) => (
                                    <Box
                                        onClick={onClick}
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            mb: 1,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            borderRadius: "50%",
                                            border: "1.5px solid",
                                            borderColor: currentIcon
                                                ? p.line
                                                : p.ink3,
                                            borderStyle: currentIcon
                                                ? "solid"
                                                : "dashed",
                                            backgroundColor: p.indigoSoft,
                                            cursor: "pointer",
                                            transition: "all 140ms ease",
                                            "&:hover": {
                                                borderColor: p.indigo,
                                            },
                                        }}
                                    >
                                        {currentIcon ? (
                                            <GameIcon
                                                name={currentIcon}
                                                sx={{
                                                    fontSize: "1.5rem",
                                                    color: p.indigo,
                                                }}
                                            />
                                        ) : (
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    fontSize: "0.55rem",
                                                    color: p.ink3,
                                                }}
                                            >
                                                Ikona
                                            </Typography>
                                        )}
                                    </Box>
                                )}
                            />
                            <Typography
                                variant="h5"
                                sx={{
                                    fontWeight: 700,
                                    color: p.indigo,
                                }}
                            >
                                {card.prefix && (
                                    <Typography
                                        component="span"
                                        variant="body2"
                                        sx={{
                                            mr: 0.5,
                                            color: p.ink2,
                                            fontWeight: 400,
                                        }}
                                    >
                                        {card.prefix}
                                    </Typography>
                                )}
                                {card.value}
                                {card.suffix && (
                                    <Typography
                                        component="span"
                                        variant="body2"
                                        sx={{
                                            ml: 0.5,
                                            color: p.ink2,
                                            fontWeight: 400,
                                        }}
                                    >
                                        {card.suffix}
                                    </Typography>
                                )}
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{ color: p.ink2 }}
                            >
                                {card.label}
                            </Typography>
                        </Box>
                    );
                })}
                {resolvePreviewCards().length === 0 && (
                    <Typography variant="caption" sx={{ color: p.ink3 }}>
                        {stats ? "Žádná data" : "–"}
                    </Typography>
                )}
            </Box>
        </Box>
    );

    function resolveSuffixPreview(
        optionValue: string | undefined,
        currentValue: number
    ): {
        prefix?: string;
        displayOverride?: string;
        text: string;
    } | null {
        if (!block.suffix || !stats) return null;
        if (block.suffix.source === "manual") {
            return block.suffix.text ? { text: block.suffix.text } : null;
        }
        if (block.suffix.source === "capacity") {
            const cap =
                stats.capacityLimits?.[block.metric]?.[optionValue ?? ""];
            return cap !== undefined ? { text: `/ ${cap}` } : null;
        }
        if (block.suffix.source === "total") {
            const cap =
                stats.capacityLimits?.[block.metric]?.[optionValue ?? ""];
            if (cap === undefined) return null;
            const remaining = Math.max(0, cap - currentValue);
            return {
                prefix: "Zbývá",
                displayOverride: remaining.toLocaleString("cs-CZ"),
                text: `z ${cap.toLocaleString("cs-CZ")}`,
            };
        }
        return null;
    }

    function resolvePreviewCards(): {
        value: string;
        label: string;
        prefix: string | null;
        suffix: string | null;
    }[] {
        if (!stats) return [];
        if (source === "builtin" && isBuiltinMetric(block.metric)) {
            const raw = stats[block.metric as BuiltinMetric] ?? 0;
            const isCurrency = BUILTIN_CURRENCY_METRICS.includes(
                block.metric as BuiltinMetric
            );
            const si = resolveSuffixPreview(undefined, raw);
            return [
                {
                    value:
                        si?.displayOverride ??
                        (isCurrency
                            ? formatPrice(raw)
                            : raw.toLocaleString("cs-CZ")),
                    label: BUILTIN_METRIC_LABELS[block.metric as BuiltinMetric],
                    prefix: si?.prefix ?? null,
                    suffix: si?.text ?? null,
                },
            ];
        }
        const fs = stats.fields?.[block.metric];
        if (!fs) return [];
        const options = stats.fieldOptions?.[block.metric];
        const counts = fs.counts;

        if (options && options.length > 0) {
            return options.map((option) => {
                const count = counts[option] ?? 0;
                const si = resolveSuffixPreview(option, count);
                return {
                    value: si?.displayOverride ?? count.toLocaleString("cs-CZ"),
                    label: option,
                    prefix: si?.prefix ?? null,
                    suffix: si?.text ?? null,
                };
            });
        }

        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([option, count]) => {
                const si = resolveSuffixPreview(option, count);
                return {
                    value: si?.displayOverride ?? count.toLocaleString("cs-CZ"),
                    label: option,
                    prefix: si?.prefix ?? null,
                    suffix: si?.text ?? null,
                };
            });
    }
}
