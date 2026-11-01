"use client";

import { Box, Paper, Typography } from "@mui/material";
import { useDroppable } from "@dnd-kit/core";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface Props {
    blockId: string;
}

export function EmptyBlockDropZone({ blockId }: Props) {
    const { setNodeRef, isOver } = useDroppable({
        id: `container-${blockId}`,
    });

    return (
        <Paper
            elevation={0}
            sx={{
                display: "flex",
                alignItems: "stretch",
                mb: 1,
                border: "none",
                borderLeft: "4px solid",
                borderLeftColor: p.fieldInk,
                backgroundColor: p.surface2,
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
                borderBottomLeftRadius: "12px",
                borderBottomRightRadius: "12px",
                pl: 3,
                pr: 1,
                pt: 0.5,
                pb: 1,
            }}
        >
            <Box
                ref={setNodeRef}
                sx={{
                    flex: 1,
                    py: 2,
                    textAlign: "center",
                    border: `2px dashed ${isOver ? p.indigo : p.line}`,
                    borderRadius: "10px",
                    backgroundColor: isOver ? p.indigoSoft : p.surface,
                    transition: "all 140ms ease",
                }}
            >
                <Typography variant="body2" sx={{ color: p.ink3 }}>
                    Přetáhněte pole sem
                </Typography>
            </Box>
        </Paper>
    );
}
