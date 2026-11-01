"use client";

import { Box, TextField, Typography } from "@mui/material";
import {
    BUILTIN_METRIC_LABELS,
    BUILTIN_CURRENCY_METRICS,
    FIELD_AGGREGATION_LABELS,
    isBuiltinMetric,
    type StatSingleBlock,
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

interface StatSingleBlockEditorProps {
    block: StatSingleBlock;
    onChange: (block: StatSingleBlock) => void;
    yearId?: string;
}

export function StatSingleBlockEditor({
    block,
    onChange,
    yearId,
}: StatSingleBlockEditorProps) {
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
                    flexShrink: 0,
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
                    onChange={(f) => onChange({ ...block, filter: f })}
                    yearId={yearId}
                />
            </Box>

            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: 1,
                    py: 1.5,
                    backgroundColor: p.surface2,
                    borderTop: `1px solid ${p.line}`,
                }}
            >
                <IconPicker
                    value={block.icon ?? null}
                    onChange={(icon) =>
                        onChange({
                            ...block,
                            icon: icon ?? undefined,
                        })
                    }
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
                                borderColor: currentIcon ? p.line : p.ink3,
                                borderStyle: currentIcon ? "solid" : "dashed",
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
                    {resolvePreviewPrefix() && (
                        <Typography
                            component="span"
                            variant="body2"
                            sx={{
                                mr: 0.5,
                                color: p.ink2,
                                fontWeight: 400,
                            }}
                        >
                            {resolvePreviewPrefix()}
                        </Typography>
                    )}
                    {resolvePreviewDisplay()}
                    {resolvePreviewSuffixText() && (
                        <Typography
                            component="span"
                            variant="body2"
                            sx={{
                                ml: 0.5,
                                color: p.ink2,
                                fontWeight: 400,
                            }}
                        >
                            {resolvePreviewSuffixText()}
                        </Typography>
                    )}
                </Typography>
                <Typography variant="caption" sx={{ color: p.ink2 }}>
                    {block.label ?? defaultLabel}
                </Typography>
            </Box>
        </Box>
    );

    function resolvePreviewRaw(): number {
        if (!stats) return 0;
        if (source === "builtin" && isBuiltinMetric(block.metric)) {
            return stats[block.metric as BuiltinMetric] ?? 0;
        }
        const fs = stats.fields?.[block.metric];
        if (!fs) return 0;
        const agg = block.aggregation ?? "count";
        const filteredOption = block.filter?.fieldFilters?.find(
            (ff) => ff.fieldName === block.metric
        )?.value;
        if (filteredOption !== undefined && agg === "count") {
            return fs.counts?.[filteredOption] ?? 0;
        }
        switch (agg) {
            case "sum":
                return fs.sum;
            case "average":
                return fs.average;
            default:
                return fs.total;
        }
    }

    function resolvePreviewSuffixInfo(): {
        prefix?: string;
        displayOverride?: string;
        text: string;
    } | null {
        if (!block.suffix || !stats) return null;
        if (block.suffix.source === "manual") {
            return block.suffix.text ? { text: block.suffix.text } : null;
        }
        const filteredOption = block.filter?.fieldFilters?.find(
            (ff) => ff.fieldName === block.metric
        )?.value;
        const limits = stats.capacityLimits?.[block.metric];
        if (block.suffix.source === "capacity") {
            if (!limits) return null;
            if (filteredOption !== undefined) {
                const cap = limits[filteredOption];
                return cap !== undefined ? { text: `/ ${cap}` } : null;
            }
            const values = Object.values(limits);
            if (values.length === 0) return null;
            const total = values.reduce((a, b) => a + b, 0);
            return { text: `/ ${total}` };
        }
        if (block.suffix.source === "total") {
            if (!limits) return null;
            let cap: number;
            if (filteredOption !== undefined) {
                const optCap = limits[filteredOption];
                if (optCap === undefined) return null;
                cap = optCap;
            } else {
                const values = Object.values(limits);
                if (values.length === 0) return null;
                cap = values.reduce((a, b) => a + b, 0);
            }
            const raw = resolvePreviewRaw();
            const remaining = Math.max(0, cap - raw);
            return {
                prefix: "Zbývá",
                displayOverride: remaining.toLocaleString("cs-CZ"),
                text: `z ${cap.toLocaleString("cs-CZ")}`,
            };
        }
        return null;
    }

    function resolvePreviewDisplay(): string {
        if (!stats) return "–";
        const si = resolvePreviewSuffixInfo();
        if (si?.displayOverride) return si.displayOverride;
        const raw = resolvePreviewRaw();
        if (source === "builtin" && isBuiltinMetric(block.metric)) {
            return BUILTIN_CURRENCY_METRICS.includes(
                block.metric as BuiltinMetric
            )
                ? formatPrice(raw)
                : raw.toLocaleString("cs-CZ");
        }
        const fs = stats.fields?.[block.metric];
        if (!fs) return "0";
        const agg = block.aggregation ?? "count";
        return fs.isCurrency && agg === "sum"
            ? formatPrice(raw)
            : raw.toLocaleString("cs-CZ");
    }

    function resolvePreviewPrefix(): string | null {
        return resolvePreviewSuffixInfo()?.prefix ?? null;
    }

    function resolvePreviewSuffixText(): string | null {
        return resolvePreviewSuffixInfo()?.text ?? null;
    }
}
