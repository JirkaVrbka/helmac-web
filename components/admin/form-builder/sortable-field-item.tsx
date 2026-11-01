"use client";

import { Box, Paper } from "@mui/material";
import { DragIndicator } from "@mui/icons-material";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

/**
 * Position of this row within a block-group:
 * - "standalone"   — root row, not part of a block group
 * - "block-solo"   — block header with no children below
 * - "block-head"   — block header with at least one child below
 * - "block-middle" — child inside a block, not the last child
 * - "block-tail"   — last child of a block group
 */
export type BlockPosition =
    | "standalone"
    | "block-solo"
    | "block-head"
    | "block-middle"
    | "block-tail";

interface SortableFieldItemProps {
    id: string;
    blockPosition?: BlockPosition;
    parentBeingDragged?: boolean;
    children: React.ReactNode;
}

export function SortableFieldItem({
    id,
    blockPosition = "standalone",
    parentBeingDragged = false,
    children,
}: SortableFieldItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging || parentBeingDragged ? 0.4 : 1,
    };

    const isBlockMember = blockPosition !== "standalone";
    const isBlockHead =
        blockPosition === "block-head" || blockPosition === "block-solo";
    const isBlockTail =
        blockPosition === "block-tail" || blockPosition === "block-solo";
    const isBlockChild =
        blockPosition === "block-middle" || blockPosition === "block-tail";

    // Block group treatment: continuous blue rail + muted bg on the wrapper.
    // Block-child rows additionally wrap their drag-handle+content in an
    // inner outlined white card, with padding on the wrapper acting as a
    // visible gutter — same look as the original master.
    const wrapperSx = {
        display: "flex",
        alignItems: "stretch",
        mb: isBlockMember && !isBlockTail ? 0 : 1,
        // Group delineated by the left rail + inner card outline; standalone
        // rows are white builder blocks with a full border.
        border: isBlockMember
            ? "none"
            : `1px solid ${isDragging ? p.indigo : p.line}`,
        borderLeft: isBlockMember ? "4px solid" : undefined,
        borderLeftColor: isBlockMember ? p.fieldInk : undefined,
        backgroundColor: isBlockMember ? p.surface2 : p.surface,
        borderTopLeftRadius: isBlockMember && !isBlockHead ? 0 : "12px",
        borderTopRightRadius: isBlockMember && !isBlockHead ? 0 : "12px",
        borderBottomLeftRadius: isBlockMember && !isBlockTail ? 0 : "12px",
        borderBottomRightRadius: isBlockMember && !isBlockTail ? 0 : "12px",
        boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.15)" : "none",
        transition: "box-shadow 140ms ease",
        ...(!isBlockMember && !isDragging
            ? { "&:hover": { boxShadow: "0 2px 10px rgba(15,23,42,0.06)" } }
            : {}),
        // Gutter around the inner card for block-child rows.
        pl: isBlockChild ? 3 : 0,
        pr: isBlockChild ? 1 : 0,
        pt: isBlockChild ? 0.5 : 0,
        pb: isBlockChild && isBlockTail ? 1 : isBlockChild ? 0.5 : 0,
        "&:last-child": { mb: 0 },
    } as const;

    const dragHandle = (
        <Box
            {...attributes}
            {...listeners}
            sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 1.5,
                cursor: "grab",
                color: p.ink3,
                "&:hover": { color: p.ink2 },
                "&:active": { cursor: "grabbing" },
            }}
        >
            <DragIndicator />
        </Box>
    );

    const content = <Box sx={{ flex: 1, overflow: "hidden" }}>{children}</Box>;

    return (
        <Paper ref={setNodeRef} style={style} elevation={0} sx={wrapperSx}>
            {isBlockChild ? (
                <Paper
                    elevation={0}
                    sx={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        borderRadius: "10px",
                        border: `1px solid ${p.line}`,
                        backgroundColor: p.surface,
                        overflow: "hidden",
                    }}
                >
                    {dragHandle}
                    {content}
                </Paper>
            ) : (
                <>
                    {dragHandle}
                    {content}
                </>
            )}
        </Paper>
    );
}
