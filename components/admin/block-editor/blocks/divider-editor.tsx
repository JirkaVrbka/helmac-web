"use client";

import {
    Box,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from "@mui/material";
import { DecorativeDivider } from "@/components/public/ui/Divider";
import type { DividerBlock, DividerVariant } from "@/lib/types/content-blocks";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

const VARIANTS: { value: DividerVariant; label: string }[] = [
    { value: "simple", label: "Jednoduchý" },
    { value: "simple-reversed", label: "Převrácený" },
    { value: "ornate", label: "Ozdobný" },
];

interface DividerBlockEditorProps {
    block: DividerBlock;
    onChange: (block: DividerBlock) => void;
}

export function DividerBlockEditor({
    block,
    onChange,
}: DividerBlockEditorProps) {
    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    px: 1,
                    py: 0.5,
                    borderBottom: `1px solid ${p.line}`,
                    backgroundColor: p.surface2,
                    flexShrink: 0,
                }}
            >
                <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={block.variant}
                    onChange={(_, v) => {
                        if (v) onChange({ ...block, variant: v });
                    }}
                    sx={{
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
                    }}
                >
                    {VARIANTS.map(({ value, label }) => (
                        <ToggleButton key={value} value={value}>
                            <Typography variant="caption">{label}</Typography>
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </Box>
            <Box
                sx={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    px: 2,
                    minHeight: 60,
                }}
            >
                <Box sx={{ width: "100%" }}>
                    <DecorativeDivider variant={block.variant} sx={{ my: 0 }} />
                </Box>
            </Box>
        </Box>
    );
}
