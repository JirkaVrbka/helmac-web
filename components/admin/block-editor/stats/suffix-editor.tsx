"use client";

import { Box, Chip, TextField, Typography } from "@mui/material";
import type { StatSuffix, StatSuffixSource } from "@/lib/types/content-blocks";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

const SUFFIX_OPTIONS: {
    v: StatSuffixSource | undefined;
    l: string;
}[] = [
    { v: undefined, l: "Žádný" },
    { v: "manual", l: "Ruční" },
    { v: "capacity", l: "Limit" },
    { v: "total", l: "Zbývá" },
];

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

interface StatSuffixEditorProps {
    value?: StatSuffix;
    onChange: (suffix: StatSuffix | undefined) => void;
}

export function StatSuffixEditor({ value, onChange }: StatSuffixEditorProps) {
    return (
        <Box>
            <Typography
                variant="caption"
                sx={{
                    fontSize: "0.7rem",
                    mb: 0.5,
                    display: "block",
                    color: p.ink2,
                }}
            >
                Doplněk hodnoty
            </Typography>
            <Box
                sx={{
                    display: "flex",
                    gap: 0.5,
                    alignItems: "center",
                }}
            >
                {SUFFIX_OPTIONS.map((opt) => {
                    const selected = (value?.source ?? undefined) === opt.v;
                    return (
                        <Chip
                            key={String(opt.v)}
                            label={opt.l}
                            size="small"
                            variant={selected ? "filled" : "outlined"}
                            onClick={() =>
                                onChange(
                                    opt.v
                                        ? {
                                              source: opt.v,
                                              text: value?.text,
                                          }
                                        : undefined
                                )
                            }
                            sx={chipSx(selected)}
                        />
                    );
                })}
            </Box>
            {value?.source === "manual" && (
                <TextField
                    value={value.text ?? ""}
                    onChange={(e) =>
                        onChange({
                            ...value,
                            text: e.target.value || undefined,
                        })
                    }
                    size="small"
                    fullWidth
                    placeholder="/ 20"
                    sx={{ mt: 0.5, ...builderFieldSx }}
                />
            )}
        </Box>
    );
}
