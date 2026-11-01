"use client";

import { Box, IconButton, Typography } from "@mui/material";
import { ContentCopy, Delete } from "@mui/icons-material";
import type { ContentBlockType } from "@/lib/types/content-blocks";
import type {
    DraggableAttributes,
    DraggableSyntheticListeners,
} from "@dnd-kit/core";
import { BLOCK_META } from "./block-meta";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface BlockFrameProps {
    type: ContentBlockType;
    width: number;
    onDuplicate?: () => void;
    onDelete: () => void;
    dragHandleListeners?: DraggableSyntheticListeners;
    dragHandleAttributes?: DraggableAttributes;
    children: React.ReactNode;
}

export function BlockFrame({
    type,
    width,
    onDuplicate,
    onDelete,
    dragHandleListeners,
    dragHandleAttributes,
    children,
}: BlockFrameProps) {
    const meta = BLOCK_META[type];

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                border: `1px solid ${p.line}`,
                borderRadius: "12px",
                overflow: "hidden",
                backgroundColor: type === "group" ? "transparent" : p.surface,
                height: "100%",
                transition: "box-shadow 140ms ease",
                "&:hover": {
                    boxShadow: "0 2px 10px rgba(15,23,42,0.06)",
                },
            }}
        >
            <Box
                {...dragHandleAttributes}
                {...dragHandleListeners}
                suppressHydrationWarning
                sx={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    px: 0.5,
                    py: 0.25,
                    backgroundColor: p.surface2,
                    borderBottom: `1px solid ${p.line}`,
                    flexShrink: 0,
                    cursor: "grab",
                    "&:active": { cursor: "grabbing" },
                    "& > [data-drag-dots]": {
                        visibility: "hidden",
                    },
                    "&:hover > [data-drag-dots]": {
                        visibility: "visible",
                    },
                }}
            >
                <Box
                    sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: p.indigo,
                        backgroundColor: p.indigoSoft,
                        borderRadius: "6px",
                        px: "4px",
                        py: "2px",
                        "& svg": { fontSize: 15 },
                    }}
                >
                    {meta?.icon}
                </Box>
                <Box sx={{ flex: 1 }} />
                <Typography
                    variant="caption"
                    sx={{
                        color: p.ink3,
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                    }}
                >
                    {width}/12
                </Typography>
                {onDuplicate && (
                    <IconButton
                        size="small"
                        onClick={onDuplicate}
                        sx={{
                            color: p.ink3,
                            borderRadius: "8px",
                            p: 0.25,
                            ml: 0.5,
                            transition: "all 140ms ease",
                            "&:hover": {
                                color: p.indigo,
                                backgroundColor: p.indigoSoft,
                            },
                        }}
                    >
                        <ContentCopy sx={{ fontSize: 14 }} />
                    </IconButton>
                )}
                <IconButton
                    size="small"
                    onClick={onDelete}
                    sx={{
                        color: p.ink3,
                        borderRadius: "8px",
                        p: 0.25,
                        ml: 0.5,
                        transition: "all 140ms ease",
                        "&:hover": {
                            color: p.negInk,
                            backgroundColor: p.neg,
                        },
                    }}
                >
                    <Delete sx={{ fontSize: 14 }} />
                </IconButton>

                <Box
                    data-drag-dots
                    sx={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        display: "flex",
                        gap: "3px",
                    }}
                >
                    {[0, 1, 2].map((i) => (
                        <Box
                            key={i}
                            sx={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                backgroundColor: p.ink3,
                            }}
                        />
                    ))}
                </Box>
            </Box>

            <Box sx={{ flex: 1 }}>{children}</Box>
        </Box>
    );
}
