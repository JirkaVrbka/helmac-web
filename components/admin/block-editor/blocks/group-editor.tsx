"use client";

import { useCallback, useState } from "react";
import { Box, Button } from "@mui/material";
import { Add } from "@mui/icons-material";
import type {
    ContentBlock,
    ContentBlockType,
    GroupBlock,
} from "@/lib/types/content-blocks";
import { createBlock } from "@/lib/types/content-blocks";
import { isLayoutChanged } from "../constants";
import { compact, resolveCollisions } from "../use-grid-engine";
import { GridDropZone } from "../grid-drop-zone";
import { BlockTypeSelector } from "../block-type-selector";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

const BUTTON_ROWS = 2;

function childrenHeight(children: ContentBlock[]): number {
    if (children.length === 0) return 4;
    return (
        children.reduce((max, c) => Math.max(max, c.layout.y + c.layout.h), 0) +
        BUTTON_ROWS
    );
}

interface GroupBlockEditorProps {
    block: GroupBlock;
    onChange: (block: ContentBlock) => void;
    yearId?: string;
    groupZoneId: (blockId: string) => string;
}

export function GroupBlockEditor({
    block,
    onChange,
    yearId,
    groupZoneId,
}: GroupBlockEditorProps) {
    const [selectorAnchor, setSelectorAnchor] = useState<HTMLElement | null>(
        null
    );

    const zoneId = groupZoneId(block.id);

    const emitWithAutoSize = useCallback(
        (children: ContentBlock[]) => {
            onChange({
                ...block,
                layout: {
                    ...block.layout,
                    h: childrenHeight(children),
                },
                children,
            });
        },
        [block, onChange]
    );

    const appendChild = useCallback(
        (child: ContentBlock) => {
            const items = [
                ...block.children.map((c) => ({
                    id: c.id,
                    layout: c.layout,
                })),
                {
                    id: child.id,
                    layout: child.layout,
                },
            ];
            const compacted = compact(items);
            const finalLayout =
                compacted.find((c) => c.id === child.id)?.layout ??
                child.layout;
            emitWithAutoSize([
                ...block.children,
                { ...child, layout: finalLayout },
            ]);
        },
        [block, emitWithAutoSize]
    );

    const handleAddChild = useCallback(
        (type: ContentBlockType) => {
            appendChild(createBlock(type));
        },
        [appendChild]
    );

    const handleUpdateChild = useCallback(
        (id: string, updated: ContentBlock) => {
            const old = block.children.find((c) => c.id === id);
            const mapped = block.children.map((c) =>
                c.id === id ? updated : c
            );
            if (!old || !isLayoutChanged(old.layout, updated.layout)) {
                onChange({
                    ...block,
                    children: mapped,
                });
                return;
            }
            const items = mapped.map((c) => ({
                id: c.id,
                layout: c.layout,
            }));
            const resolved = resolveCollisions(items, id);
            emitWithAutoSize(
                mapped.map((c) => {
                    const r = resolved.find((rc) => rc.id === c.id);
                    return r ? { ...c, layout: r.layout } : c;
                })
            );
        },
        [block, onChange, emitWithAutoSize]
    );

    const handleDeleteChild = useCallback(
        (id: string) => {
            emitWithAutoSize(block.children.filter((c) => c.id !== id));
        },
        [block, emitWithAutoSize]
    );

    const handleDuplicateChild = useCallback(
        (id: string) => {
            const source = block.children.find((c) => c.id === id);
            if (!source) return;
            appendChild({
                ...structuredClone(source),
                id: crypto.randomUUID(),
                layout: {
                    ...source.layout,
                    y: Infinity,
                },
            });
        },
        [block, appendChild]
    );

    return (
        <Box
            sx={{
                p: 0.25,
                display: "flex",
                flexDirection: "column",
                height: "100%",
            }}
        >
            <GridDropZone
                zoneId={zoneId}
                blocks={block.children}
                onUpdateBlock={handleUpdateChild}
                onDeleteBlock={handleDeleteChild}
                onDuplicateBlock={handleDuplicateChild}
                depth={1}
                yearId={yearId}
            />
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    mt: 0.5,
                }}
            >
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={(e) => setSelectorAnchor(e.currentTarget)}
                    sx={{
                        borderRadius: "10px",
                        borderStyle: "dashed",
                        borderColor: p.line,
                        color: p.indigo,
                        fontWeight: 600,
                        textTransform: "none",
                        "&:hover": {
                            borderStyle: "dashed",
                            borderColor: p.indigo,
                            backgroundColor: p.indigoSoft,
                        },
                    }}
                >
                    Přidat blok
                </Button>
            </Box>
            <BlockTypeSelector
                anchorEl={selectorAnchor}
                onClose={() => setSelectorAnchor(null)}
                onSelect={handleAddChild}
                excludeTypes={["group"]}
            />
        </Box>
    );
}
