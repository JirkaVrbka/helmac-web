"use client";

import { useCallback } from "react";
import { Box } from "@mui/material";
import { useDraggable } from "@dnd-kit/core";
import type { ContentBlock, BlockLayout } from "@/lib/types/content-blocks";
import { GRID_COLUMNS } from "./constants";
import { BlockFrame } from "./block-frame";
import { BlockContent } from "./block-content";
import { useGridResize } from "./use-grid-resize";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

const HIT_AREA_SX = {
    position: "absolute",
    zIndex: 10,
    "& > span": { visibility: "hidden" },
    "&:hover > span": { visibility: "visible" },
} as const;

interface DraggableBlockProps {
    block: ContentBlock;
    zoneId: string;
    onUpdate: (block: ContentBlock) => void;
    onDelete: () => void;
    onDuplicate?: () => void;
    onLayoutChange: (layout: BlockLayout) => void;
    containerRef: React.RefObject<HTMLDivElement | null>;
    yearId?: string;
}

export function DraggableBlock({
    block,
    zoneId,
    onUpdate,
    onDelete,
    onDuplicate,
    onLayoutChange,
    containerRef,
    yearId,
}: DraggableBlockProps) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: block.id,
        data: { zoneId, block },
    });

    const getCellWidth = useCallback(() => {
        if (containerRef.current) {
            return containerRef.current.offsetWidth / GRID_COLUMNS;
        }
        return 60;
    }, [containerRef]);

    const { handlePointerDown, handlePointerMove, handlePointerUp } =
        useGridResize({
            layout: block.layout,
            getCellWidth,
            onChange: onLayoutChange,
        });

    return (
        <Box
            ref={setNodeRef}
            data-block-id={block.id}
            data-block-y={block.layout?.y ?? 0}
            sx={{
                gridColumn: `${(block.layout?.x ?? 0) + 1} / span ${block.layout?.w ?? GRID_COLUMNS}`,
                opacity: isDragging ? 0.3 : 1,
                position: "relative",
                display: "flex",
                flexDirection: "column",
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
        >
            <BlockFrame
                type={block.type}
                width={block.layout?.w ?? GRID_COLUMNS}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                dragHandleListeners={listeners}
                dragHandleAttributes={attributes}
            >
                <BlockContent
                    block={block}
                    onChange={onUpdate}
                    yearId={yearId}
                />
            </BlockFrame>

            <Box
                sx={{
                    ...HIT_AREA_SX,
                    left: -4,
                    top: 0,
                    bottom: 0,
                    width: 8,
                    cursor: "ew-resize",
                }}
                onPointerDown={(e) => handlePointerDown("w", e)}
            >
                <Box
                    component="span"
                    sx={{
                        position: "absolute",
                        left: 2,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 6,
                        height: 48,
                        borderRadius: 1,
                        backgroundColor: p.indigo,
                    }}
                />
            </Box>
            <Box
                sx={{
                    ...HIT_AREA_SX,
                    right: -4,
                    top: 0,
                    bottom: 0,
                    width: 8,
                    cursor: "ew-resize",
                }}
                onPointerDown={(e) => handlePointerDown("e", e)}
            >
                <Box
                    component="span"
                    sx={{
                        position: "absolute",
                        right: 2,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 6,
                        height: 48,
                        borderRadius: 1,
                        backgroundColor: p.indigo,
                    }}
                />
            </Box>
        </Box>
    );
}
