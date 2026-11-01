"use client";

import {
    Box,
    MenuItem,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from "@mui/material";
import {
    Tag,
    Functions,
    PercentOutlined,
    FormatListBulleted,
} from "@mui/icons-material";
import {
    BUILTIN_METRIC_LABELS,
    FIELD_AGGREGATION_LABELS,
    type BuiltinMetric,
    type FieldAggregation,
    type StatMetricConfig,
} from "@/lib/types/content-blocks";
import { useRegistrationFields } from "./hooks";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

const segmentedSx = {
    flexShrink: 0,
    backgroundColor: p.surface2,
    border: `1px solid ${p.line}`,
    borderRadius: "10px",
    p: "3px",
    gap: "3px",
    "& .MuiToggleButton-root": {
        py: 0.25,
        px: 1,
        border: 0,
        borderRadius: "8px !important",
        color: p.ink2,
        textTransform: "none",
        transition: "all 140ms ease",
        "&:hover": {
            backgroundColor: p.indigoSoft,
            color: p.indigo,
        },
        "&.Mui-selected": {
            backgroundColor: p.indigo,
            color: "#fff",
            "&:hover": { backgroundColor: p.indigo },
        },
    },
} as const;

const BUILTIN_METRICS = Object.entries(BUILTIN_METRIC_LABELS) as [
    BuiltinMetric,
    string,
][];

const AGGREGATION_ICONS: Record<FieldAggregation, React.ReactNode> = {
    count: <Tag sx={{ fontSize: 14 }} />,
    sum: <Functions sx={{ fontSize: 14 }} />,
    average: <PercentOutlined sx={{ fontSize: 14 }} />,
    enumerate: <FormatListBulleted sx={{ fontSize: 14 }} />,
};

interface StatMetricEditorProps {
    value: StatMetricConfig;
    onChange: (value: StatMetricConfig) => void;
    yearId?: string;
    inline?: boolean;
    forceSource?: "builtin" | "field";
    hideAggregation?: boolean;
}

export function StatMetricEditor({
    value,
    onChange,
    yearId,
    inline,
    forceSource,
    hideAggregation,
}: StatMetricEditorProps) {
    const fields = useRegistrationFields(yearId);
    const source = forceSource ?? value.source ?? "builtin";

    const showSourceToggle = !forceSource;
    const showAggregation = source === "field" && !hideAggregation;
    const showToolbar = showSourceToggle || showAggregation;

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                ...(inline ? { flex: 1, minWidth: 0 } : { flexShrink: 0 }),
            }}
        >
            {showToolbar && (
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        ...(inline
                            ? {
                                  backgroundColor: p.surface2,
                                  borderRadius: "8px",
                                  px: 0.5,
                                  py: 0.25,
                              }
                            : {
                                  px: 1,
                                  py: 0.5,
                                  borderBottom: `1px solid ${p.line}`,
                                  backgroundColor: p.surface2,
                                  flexShrink: 0,
                              }),
                    }}
                >
                    {!forceSource && (
                        <ToggleButtonGroup
                            exclusive
                            value={source}
                            onChange={(_, v) => {
                                if (!v) return;
                                if (v === "builtin") {
                                    onChange({
                                        ...value,
                                        source: "builtin",
                                        metric: "registrations",
                                        aggregation: undefined,
                                    });
                                } else {
                                    onChange({
                                        ...value,
                                        source: "field",
                                        metric: fields?.[0]?.name ?? "",
                                        aggregation: "count",
                                    });
                                }
                            }}
                            size="small"
                            sx={segmentedSx}
                        >
                            <ToggleButton value="builtin">
                                <Typography variant="caption">
                                    Globální
                                </Typography>
                            </ToggleButton>
                            <ToggleButton value="field">
                                <Typography variant="caption">
                                    Z formuláře
                                </Typography>
                            </ToggleButton>
                        </ToggleButtonGroup>
                    )}

                    {source === "field" && !hideAggregation && (
                        <>
                            <Box sx={{ flex: 1 }} />
                            <ToggleButtonGroup
                                exclusive
                                value={value.aggregation ?? "count"}
                                onChange={(_, v) => {
                                    if (!v) return;
                                    onChange({
                                        ...value,
                                        aggregation: v as FieldAggregation,
                                    });
                                }}
                                size="small"
                                sx={{
                                    ...segmentedSx,
                                    "& .MuiToggleButton-root": {
                                        ...segmentedSx[
                                            "& .MuiToggleButton-root"
                                        ],
                                        px: 0.5,
                                    },
                                }}
                            >
                                {(
                                    Object.keys(
                                        FIELD_AGGREGATION_LABELS
                                    ) as FieldAggregation[]
                                ).map((v) => (
                                    <ToggleButton key={v} value={v}>
                                        <Tooltip
                                            title={FIELD_AGGREGATION_LABELS[v]}
                                        >
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                }}
                                            >
                                                {AGGREGATION_ICONS[v]}
                                            </Box>
                                        </Tooltip>
                                    </ToggleButton>
                                ))}
                            </ToggleButtonGroup>
                        </>
                    )}
                </Box>
            )}

            <Box
                sx={{
                    display: "flex",
                    gap: 0.5,
                    ...(inline ? { mt: 0.5 } : { px: 1, pt: 0.5 }),
                }}
            >
                <TextField
                    select
                    value={value.metric}
                    onChange={(e) =>
                        onChange({
                            ...value,
                            metric: e.target.value,
                        })
                    }
                    size="small"
                    fullWidth
                    sx={{
                        ...builderFieldSx,
                        "& .MuiInputBase-root": {
                            fontSize: "0.8rem",
                        },
                    }}
                >
                    {source === "builtin"
                        ? BUILTIN_METRICS.map(([v, label]) => (
                              <MenuItem key={v} value={v}>
                                  {label}
                              </MenuItem>
                          ))
                        : (fields?.map((f) => (
                              <MenuItem key={f.name} value={f.name}>
                                  {f.label}
                              </MenuItem>
                          )) ?? (
                              <MenuItem value="" disabled>
                                  Načítání...
                              </MenuItem>
                          ))}
                </TextField>

                {source === "field" && (
                    <TextField
                        select
                        label="Výchozí hodnota z"
                        value={value.fallback ?? ""}
                        onChange={(e) =>
                            onChange({
                                ...value,
                                fallback: e.target.value || undefined,
                            })
                        }
                        size="small"
                        fullWidth
                        sx={{
                            ...builderFieldSx,
                            "& .MuiInputBase-root": {
                                fontSize: "0.8rem",
                            },
                        }}
                    >
                        <MenuItem value="">
                            <em>Žádný</em>
                        </MenuItem>
                        {fields
                            ?.filter((f) => f.name !== value.metric)
                            .map((f) => (
                                <MenuItem key={f.name} value={f.name}>
                                    {f.label}
                                </MenuItem>
                            )) ?? (
                            <MenuItem value="" disabled>
                                Načítání...
                            </MenuItem>
                        )}
                    </TextField>
                )}
            </Box>

            <TextField
                value={value.label ?? ""}
                onChange={(e) =>
                    onChange({
                        ...value,
                        label: e.target.value || undefined,
                    })
                }
                size="small"
                fullWidth
                placeholder="Vlastní popisek"
                sx={{
                    ...(inline ? { mt: 0.5 } : { px: 1, pt: 0.5 }),
                    ...builderFieldSx,
                    "& .MuiInputBase-root": {
                        fontSize: "0.8rem",
                    },
                }}
            />
        </Box>
    );
}
