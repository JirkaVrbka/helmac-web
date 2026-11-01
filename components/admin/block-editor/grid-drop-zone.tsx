"use client";

import { useRef, useCallback, useMemo } from "react";
import { Box } from "@mui/material";
import { useDroppable } from "@dnd-kit/core";
import type { ContentBlock, BlockLayout } from "@/lib/types/content-blocks";
import {
    ROW_HEIGHT,
    GRID_GAP,
    GRID_COLUMNS,
    compareByLayout,
} from "./constants";
import { DraggableBlock } from "./draggable-block";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface GridDropZoneProps {
    zoneId: string;
    blocks: ContentBlock[];
    onUpdateBlock: (id: string, block: ContentBlock) => void;
    onDeleteBlock: (id: string) => void;
    onDuplicateBlock: (id: string) => void;
    depth?: number;
    yearId?: string;
}

export function GridDropZone({
    zoneId,
    blocks,
    onUpdateBlock,
    onDeleteBlock,
    onDuplicateBlock,
    depth = 0,
    yearId,
}: GridDropZoneProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { setNodeRef, isOver } = useDroppable({
        id: zoneId,
    });

    const mergedRef = useCallback(
        (node: HTMLDivElement | null) => {
            (
                containerRef as React.MutableRefObject<HTMLDivElement | null>
            ).current = node;
            setNodeRef(node);
        },
        [setNodeRef]
    );

    const sorted = useMemo(() => [...blocks].sort(compareByLayout), [blocks]);

    const handleLayoutChange = useCallback(
        (id: string, layout: BlockLayout) => {
            const block = blocks.find((b) => b.id === id);
            if (!block) return;
            onUpdateBlock(id, { ...block, layout });
        },
        [blocks, onUpdateBlock]
    );

    return (
        <Box
            ref={mergedRef}
            data-zone-id={zoneId}
            sx={{
                position: "relative",
                display: "grid",
                gridTemplateColumns: `repeat(${GRID_COLUMNS}, 1fr)`,
                alignItems: "stretch",
                gap: `${GRID_GAP}px`,
                border: isOver
                    ? `2px dashed ${p.indigo}`
                    : "2px dashed transparent",
                borderRadius: "10px",
                transition: "border-color 0.15s",
                flex: depth > 0 ? 1 : undefined,
                p: depth > 0 ? 0.25 : 0,
            }}
        >
            {sorted.map((block) => (
                <DraggableBlock
                    key={block.id}
                    block={block}
                    zoneId={zoneId}
                    onUpdate={(b: ContentBlock) => onUpdateBlock(block.id, b)}
                    onDelete={() => onDeleteBlock(block.id)}
                    onDuplicate={
                        block.type === "card"
                            ? () => onDuplicateBlock(block.id)
                            : undefined
                    }
                    onLayoutChange={(layout: BlockLayout) =>
                        handleLayoutChange(block.id, layout)
                    }
                    containerRef={containerRef}
                    yearId={yearId}
                />
            ))}

            {depth === 0 && (
                <Box
                    data-drop-spacer
                    sx={{
                        gridColumn: "1 / -1",
                        minHeight: ROW_HEIGHT * 3,
                        border: `2px dashed ${p.line}`,
                        borderRadius: "10px",
                        opacity: 0.3,
                    }}
                />
            )}
        </Box>
    );
}
