"use client";

import {
    type SetStateAction,
    useId,
    useEffect,
    useState,
    useCallback,
    useMemo,
    useRef,
} from "react";
import { Box, Button, Typography } from "@mui/material";
import { Add } from "@mui/icons-material";
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    pointerWithin,
    type DragStartEvent,
    type DragMoveEvent,
    type DragEndEvent,
} from "@dnd-kit/core";
import type {
    ContentBlock,
    ContentBlockType,
} from "@/lib/types/content-blocks";
import { createBlock, normalizeBlocks } from "@/lib/types/content-blocks";
import {
    GRID_ROOT,
    GRID_COLUMNS,
    ROW_HEIGHT,
    GRID_GAP,
    parseGroupZoneId,
    isLayoutChanged,
    isGroupBlock,
} from "./constants";
import { resolveCollisions, reorderBlock } from "./use-grid-engine";
import { GridDropZone } from "./grid-drop-zone";
import { BlockTypeSelector } from "./block-type-selector";
import { BlockFrame } from "./block-frame";
import { BLOCK_META } from "./block-meta";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

function removeBlockFromSource(
    prev: ContentBlock[],
    blockId: string,
    sourceZone: string
): {
    block: ContentBlock | undefined;
    remaining: ContentBlock[];
} {
    if (sourceZone === GRID_ROOT) {
        return {
            block: prev.find((b) => b.id === blockId),
            remaining: prev.filter((b) => b.id !== blockId),
        };
    }

    const srcGroupId = parseGroupZoneId(sourceZone);
    if (!srcGroupId) return { block: undefined, remaining: prev };

    let block: ContentBlock | undefined;
    const remaining = prev.map((b) => {
        if (b.id !== srcGroupId || !isGroupBlock(b)) return b;
        const gb = b;
        block = gb.children.find((c) => c.id === blockId);
        return {
            ...b,
            children: gb.children.filter((c) => c.id !== blockId),
        };
    });

    return { block, remaining };
}

function maxY(blocks: ContentBlock[]): number {
    return blocks.reduce((m, b) => Math.max(m, b.layout.y), -1);
}

interface RowBounds {
    y: number;
    top: number;
    bottom: number;
}

function measureRows(zoneEl: HTMLElement): RowBounds[] {
    const zoneRect = zoneEl.getBoundingClientRect();
    const rows: RowBounds[] = [];

    for (const el of zoneEl.children) {
        if (
            !el.hasAttribute("data-block-id") ||
            !el.hasAttribute("data-block-y")
        )
            continue;
        const y = Number(el.getAttribute("data-block-y"));
        const r = el.getBoundingClientRect();
        const top = r.top - zoneRect.top;
        const bottom = r.bottom - zoneRect.top;
        const existing = rows.find((row) => row.y === y);
        if (existing) {
            existing.top = Math.min(existing.top, top);
            existing.bottom = Math.max(existing.bottom, bottom);
        } else {
            rows.push({ y, top, bottom });
        }
    }
    rows.sort((a, b) => a.top - b.top);
    return rows;
}

function findDropRowFromBounds(
    relY: number,
    rows: RowBounds[]
): { y: number; lineTop: number } {
    if (rows.length === 0) return { y: 0, lineTop: 0 };

    if (relY < rows[0].top)
        return {
            y: rows[0].y,
            lineTop: rows[0].top,
        };

    for (let i = 0; i < rows.length; i++) {
        if (relY < rows[i].bottom)
            return {
                y: rows[i].y,
                lineTop: rows[i].top,
            };
    }

    const last = rows[rows.length - 1];
    return { y: last.y + 1, lineTop: last.bottom };
}

interface BlockEditorProps {
    value: ContentBlock[];
    onChange: (blocks: SetStateAction<ContentBlock[]>) => void;
    yearId?: string;
}

export function BlockEditor({
    value: rawValue,
    onChange,
    yearId,
}: BlockEditorProps) {
    const dndId = useId();

    const value = useMemo(() => normalizeBlocks(rawValue), [rawValue]);

    const [selectorAnchor, setSelectorAnchor] = useState<HTMLElement | null>(
        null
    );

    const [activeDrag, setActiveDrag] = useState<{
        block: ContentBlock;
        zoneId: string;
        overlayWidth: number;
        blockHeight: number;
    } | null>(null);

    const gridContainerRef = useRef<HTMLDivElement>(null);
    const dropIndicatorRef = useRef<HTMLDivElement>(null);
    const grabOffsetRef = useRef({ col: 0 });
    const isDraggingRef = useRef(false);
    const cachedRowsRef = useRef<RowBounds[]>([]);
    const activeDragRef = useRef(activeDrag);
    useEffect(() => {
        activeDragRef.current = activeDrag;
    }, [activeDrag]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        }),
        useSensor(KeyboardSensor)
    );

    // --- Block CRUD ---

    const handleAddBlock = useCallback(
        (type: ContentBlockType) => {
            const block = createBlock(type);
            onChange((prev) => [
                ...prev,
                {
                    ...block,
                    layout: {
                        ...block.layout,
                        y: maxY(prev) + 1,
                    },
                },
            ]);
        },
        [onChange]
    );

    const handleUpdateBlock = useCallback(
        (id: string, updated: ContentBlock) => {
            onChange((prev) => {
                const old = prev.find((b) => b.id === id);
                const mapped = prev.map((b) => (b.id === id ? updated : b));

                if (!old || !isLayoutChanged(old.layout, updated.layout))
                    return mapped;

                const items = mapped.map((b) => ({
                    id: b.id,
                    layout: b.layout,
                }));
                const resolved = resolveCollisions(items, id);
                return mapped.map((b) => {
                    const r = resolved.find((c) => c.id === b.id);
                    return r ? { ...b, layout: r.layout } : b;
                });
            });
        },
        [onChange]
    );

    const handleDeleteBlock = useCallback(
        (id: string) => {
            onChange((prev) => prev.filter((b) => b.id !== id));
        },
        [onChange]
    );

    const handleDuplicateBlock = useCallback(
        (id: string) => {
            onChange((prev) => {
                const source = prev.find((b) => b.id === id);
                if (!source) return prev;
                return [
                    ...prev,
                    {
                        ...structuredClone(source),
                        id: crypto.randomUUID(),
                        layout: {
                            ...source.layout,
                            y: maxY(prev) + 1,
                        },
                    },
                ];
            });
        },
        [onChange]
    );

    // --- Drag helpers ---

    const findZoneElement = useCallback(
        (zoneId: string): HTMLElement | null => {
            if (!gridContainerRef.current) return null;
            return gridContainerRef.current.querySelector(
                `[data-zone-id="${zoneId}"]`
            );
        },
        []
    );

    const snapPosition = useCallback(
        (
            px: number,
            py: number,
            zoneEl: HTMLElement,
            blockW: number,
            rows?: RowBounds[]
        ): {
            x: number;
            y: number;
            lineTop: number;
        } => {
            const rect = zoneEl.getBoundingClientRect();
            const cellWidth = rect.width / GRID_COLUMNS;
            const col = (px - rect.left) / cellWidth;
            const offset = grabOffsetRef.current;
            const x = Math.max(
                0,
                Math.min(GRID_COLUMNS - blockW, Math.round(col - offset.col))
            );
            const relY = py - rect.top;
            const { y, lineTop } = findDropRowFromBounds(
                relY,
                rows ?? measureRows(zoneEl)
            );
            return { x, y, lineTop };
        },
        []
    );

    const currentPointer = (event: DragMoveEvent | DragEndEvent) => {
        const pe = event.activatorEvent as PointerEvent;
        return {
            x: pe.clientX + (event.delta?.x ?? 0),
            y: pe.clientY + (event.delta?.y ?? 0),
        };
    };

    const showIndicator = (
        left: number,
        top: number,
        width: number,
        height: number
    ) => {
        const el = dropIndicatorRef.current;
        if (!el) return;
        el.style.display = "block";
        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
        el.style.width = `${width}px`;
        el.style.height = `${height}px`;
    };

    const hideIndicator = () => {
        const el = dropIndicatorRef.current;
        if (el) el.style.display = "none";
    };

    // --- Drag handlers ---

    const handleDragStart = useCallback(
        (event: DragStartEvent) => {
            const data = event.active.data.current as {
                zoneId: string;
                block: ContentBlock;
            };
            isDraggingRef.current = true;

            const blockEl = gridContainerRef.current?.querySelector(
                `[data-block-id="${data.block.id}"]`
            );
            const blockRect = blockEl?.getBoundingClientRect();
            setActiveDrag({
                block: data.block,
                zoneId: data.zoneId,
                overlayWidth: blockRect?.width ?? 200,
                blockHeight: blockRect?.height ?? ROW_HEIGHT * 2,
            });

            const zoneEl = findZoneElement(data.zoneId);
            if (zoneEl) {
                const pe = event.activatorEvent as PointerEvent;
                const rect = zoneEl.getBoundingClientRect();
                const cellWidth = rect.width / GRID_COLUMNS;
                grabOffsetRef.current = {
                    col:
                        (pe.clientX - rect.left) / cellWidth -
                        data.block.layout.x,
                };
                cachedRowsRef.current = measureRows(zoneEl);
            } else {
                grabOffsetRef.current = { col: 0 };
                cachedRowsRef.current = [];
            }
        },
        [findZoneElement]
    );

    const handleDragMove = useCallback(
        (event: DragMoveEvent) => {
            const drag = activeDragRef.current;
            if (!isDraggingRef.current || !drag) {
                hideIndicator();
                return;
            }

            const overDroppable = event.over;
            if (!overDroppable) {
                hideIndicator();
                return;
            }

            const targetZoneId = String(overDroppable.id);

            const targetGroupId = parseGroupZoneId(targetZoneId);

            if (drag.block.type === "group" && targetGroupId !== null) {
                hideIndicator();
                return;
            }

            const isGroupTarget = targetGroupId !== null;

            const zoneEl = findZoneElement(targetZoneId);
            if (!zoneEl) return;

            const zoneRect = zoneEl.getBoundingClientRect();
            const containerRect =
                gridContainerRef.current?.getBoundingClientRect();
            const offsetTop = containerRect
                ? zoneRect.top - containerRect.top
                : 0;
            const offsetLeft = containerRect
                ? zoneRect.left - containerRect.left
                : 0;

            if (isGroupTarget) {
                showIndicator(
                    offsetLeft,
                    offsetTop + zoneRect.height - ROW_HEIGHT,
                    zoneRect.width,
                    ROW_HEIGHT
                );
                return;
            }

            const ptr = currentPointer(event);
            const { x, lineTop } = snapPosition(
                ptr.x,
                ptr.y,
                zoneEl,
                drag.block.layout.w,
                cachedRowsRef.current.length > 0
                    ? cachedRowsRef.current
                    : undefined
            );

            const cellW =
                (zoneRect.width - (GRID_COLUMNS - 1) * GRID_GAP) / GRID_COLUMNS;
            const w = drag.block.layout.w;

            showIndicator(
                offsetLeft + x * (cellW + GRID_GAP),
                offsetTop + lineTop,
                w * cellW + (w - 1) * GRID_GAP,
                drag.blockHeight
            );
        },
        [findZoneElement, snapPosition]
    );

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const drag = activeDragRef.current;
            const dragBlock = drag?.block;
            const sourceZone = drag?.zoneId;
            isDraggingRef.current = false;
            setActiveDrag(null);
            hideIndicator();
            cachedRowsRef.current = [];

            if (!dragBlock || !sourceZone) return;

            const overDroppable = event.over;
            if (!overDroppable) return;

            const targetZoneId = String(overDroppable.id);

            if (
                dragBlock.type === "group" &&
                parseGroupZoneId(targetZoneId) !== null
            ) {
                return;
            }

            const zoneEl = findZoneElement(targetZoneId);
            if (!zoneEl) return;

            const ptr = currentPointer(event);
            const { x, y } = snapPosition(
                ptr.x,
                ptr.y,
                zoneEl,
                dragBlock.layout.w
            );

            // Same-zone drag
            if (sourceZone === targetZoneId) {
                if (sourceZone === GRID_ROOT) {
                    onChange((prev) => reorderBlock(prev, dragBlock.id, y, x));
                } else {
                    const gid = parseGroupZoneId(sourceZone);
                    if (!gid) return;
                    onChange((prev) =>
                        prev.map((b) => {
                            if (b.id !== gid || !isGroupBlock(b)) return b;
                            return {
                                ...b,
                                children: reorderBlock(
                                    b.children,
                                    dragBlock.id,
                                    y,
                                    x
                                ),
                            };
                        })
                    );
                }
                return;
            }

            // Cross-zone drag
            onChange((prev) => {
                const { block, remaining } = removeBlockFromSource(
                    prev,
                    dragBlock.id,
                    sourceZone
                );
                if (!block) return prev;

                const movedBlock: ContentBlock = {
                    ...block,
                    layout: { ...block.layout },
                } as ContentBlock;

                if (targetZoneId === GRID_ROOT) {
                    const rootEl = findZoneElement(GRID_ROOT);
                    if (rootEl) {
                        const { y: dropY } = snapPosition(
                            ptr.x,
                            ptr.y,
                            rootEl,
                            dragBlock.layout.w
                        );
                        movedBlock.layout.y = dropY;
                    } else {
                        movedBlock.layout.y = maxY(remaining) + 1;
                    }
                    return reorderBlock(
                        [...remaining, movedBlock],
                        movedBlock.id,
                        movedBlock.layout.y,
                        movedBlock.layout.x
                    );
                }

                const tgtGroupId = parseGroupZoneId(targetZoneId);
                if (!tgtGroupId) return prev;

                return remaining.map((b) => {
                    if (b.id !== tgtGroupId || !isGroupBlock(b)) return b;
                    const gb = b;
                    movedBlock.layout.y = maxY(gb.children) + 1;
                    return {
                        ...b,
                        children: [...gb.children, movedBlock],
                    };
                });
            });
        },
        [findZoneElement, snapPosition, onChange]
    );

    // --- Render ---

    const overlayMeta = activeDrag ? BLOCK_META[activeDrag.block.type] : null;

    return (
        <Box ref={gridContainerRef} sx={{ position: "relative" }}>
            <DndContext
                id={dndId}
                sensors={sensors}
                collisionDetection={pointerWithin}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
            >
                {value.length === 0 ? (
                    <Typography
                        sx={{
                            textAlign: "center",
                            py: 4,
                            color: p.ink3,
                            border: `2px dashed ${p.line}`,
                            borderRadius: "10px",
                            mb: 2,
                        }}
                    >
                        Stránka je prázdná. Přidejte první blok.
                    </Typography>
                ) : (
                    <GridDropZone
                        zoneId={GRID_ROOT}
                        blocks={value}
                        onUpdateBlock={handleUpdateBlock}
                        onDeleteBlock={handleDeleteBlock}
                        onDuplicateBlock={handleDuplicateBlock}
                        depth={0}
                        yearId={yearId}
                    />
                )}

                {/* Drop indicator — styled via
                    ref, no re-renders */}
                <Box
                    ref={dropIndicatorRef}
                    sx={{
                        display: "none",
                        position: "absolute",
                        border: `2px dashed ${p.indigo}`,
                        borderRadius: "10px",
                        pointerEvents: "none",
                        zIndex: 5,
                        opacity: 0.5,
                    }}
                />

                <DragOverlay dropAnimation={null}>
                    {activeDrag && overlayMeta && (
                        <Box
                            sx={{
                                width: activeDrag.overlayWidth,
                                opacity: 0.85,
                                pointerEvents: "none",
                            }}
                        >
                            <BlockFrame
                                type={activeDrag.block.type}
                                width={activeDrag.block.layout.w}
                                onDelete={() => {}}
                            >
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 1,
                                        py: 3,
                                        color: "text.disabled",
                                    }}
                                >
                                    {overlayMeta.icon}
                                    <Typography
                                        variant="body2"
                                        color="text.disabled"
                                    >
                                        {overlayMeta.label}
                                    </Typography>
                                </Box>
                            </BlockFrame>
                        </Box>
                    )}
                </DragOverlay>
            </DndContext>

            <Box
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    mt: 1,
                }}
            >
                <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={(e) => setSelectorAnchor(e.currentTarget)}
                    sx={{
                        borderRadius: "10px",
                        borderStyle: "dashed",
                        borderColor: p.line,
                        color: p.indigo,
                        fontWeight: 600,
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
                onSelect={handleAddBlock}
            />
        </Box>
    );
}
