"use client";

import { useState, useCallback, useRef, useId } from "react";
import {
    Typography,
    Box,
    IconButton,
    Tooltip,
    ButtonBase,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
} from "@mui/material";
import {
    Add,
    Edit,
    Delete,
    DragIndicator,
    ArticleOutlined,
} from "@mui/icons-material";
import {
    DndContext,
    rectIntersection,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
    DragOverlay,
    useDroppable,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    horizontalListSortingStrategy,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconLinkButton } from "@/components/ui/link-button";
import { SectionTypeForm } from "@/components/admin/section-type-form";
import { SectionActions } from "@/components/admin/section-actions";
import { GameIcon } from "@/lib/icons";
import {
    deleteSectionType,
    reorderSectionTypes,
    reorderSections,
    moveSection,
} from "@/lib/actions/sections";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/hooks/use-toast";
import Link from "next/link";

// ── ID helpers ──

const COL_PREFIX = "col:";
const DROP_PREFIX = "drop:";

function colId(typeId: string) {
    return `${COL_PREFIX}${typeId}`;
}

function dropId(typeId: string) {
    return `${DROP_PREFIX}${typeId}`;
}

function isColId(id: string) {
    return id.startsWith(COL_PREFIX);
}

function parseColId(id: string) {
    return id.slice(COL_PREFIX.length);
}

function isDropId(id: string) {
    return id.startsWith(DROP_PREFIX);
}

function parseDropId(id: string) {
    return id.slice(DROP_PREFIX.length);
}

// ── Types ──

interface SectionData {
    id: string;
    title: string;
    icon: string | null;
}

interface SectionTypeData {
    id: string;
    label: string;
    slug: string;
    icon: string | null;
    sortOrder: number;
    pageTitle: string | null;
    pageSubtitle: string | null;
    metaTitle: string | null;
    metaDescription: string | null;
    featuredOnIndex: boolean;
    description: string | null;
    sections: SectionData[];
}

interface SectionTypesListProps {
    yearId: string;
    sectionTypes: SectionTypeData[];
}

// ── Sortable section item ──

function SortableSectionItem({
    section,
    yearId,
}: {
    section: SectionData;
    yearId: string;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: section.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <Box
            ref={setNodeRef}
            style={style}
            sx={{
                display: "flex",
                alignItems: "center",
                mb: "4px",
                "&:last-child": { mb: 0 },
                backgroundColor: p.surface,
                border: `1px solid ${isDragging ? p.indigo : p.line}`,
                borderRadius: "10px",
                transition: "box-shadow 140ms ease",
            }}
        >
            <Box
                {...attributes}
                {...listeners}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    p: 1,
                    cursor: "grab",
                    color: p.ink3,
                    "&:hover": { color: p.ink2 },
                    "&:active": { cursor: "grabbing" },
                }}
            >
                <DragIndicator sx={{ fontSize: 18 }} />
            </Box>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    flex: 1,
                    py: 0.75,
                    pr: 1,
                }}
            >
                {section.icon ? (
                    <GameIcon
                        name={section.icon}
                        sx={{
                            color: p.ink3,
                            fontSize: 18,
                        }}
                    />
                ) : (
                    <ArticleOutlined
                        sx={{
                            color: p.ink3,
                            fontSize: 18,
                        }}
                    />
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                        sx={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: p.ink,
                        }}
                        noWrap
                    >
                        {section.title}
                    </Typography>
                </Box>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.25,
                        flexShrink: 0,
                    }}
                >
                    <Tooltip title="Upravit sekci">
                        <IconLinkButton
                            href={`/admin/rocniky/${yearId}/sekce/${section.id}`}
                            size="small"
                            sx={{
                                color: p.ink3,
                                "&:hover": {
                                    color: p.indigo,
                                },
                            }}
                        >
                            <Edit sx={{ fontSize: 16 }} />
                        </IconLinkButton>
                    </Tooltip>
                    <SectionActions
                        sectionId={section.id}
                        sectionTitle={section.title}
                    />
                </Box>
            </Box>
        </Box>
    );
}

// ── Drag overlay ──

function SectionDragOverlay({ section }: { section: SectionData }) {
    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                backgroundColor: p.surface,
                border: `1px solid ${p.indigo}`,
                borderRadius: "10px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                px: 1.5,
                py: 1,
                gap: 1.5,
                minWidth: 180,
            }}
        >
            <DragIndicator sx={{ fontSize: 18, color: p.ink3 }} />
            {section.icon ? (
                <GameIcon
                    name={section.icon}
                    sx={{ color: p.ink3, fontSize: 18 }}
                />
            ) : (
                <ArticleOutlined sx={{ color: p.ink3, fontSize: 18 }} />
            )}
            <Typography
                sx={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: p.ink,
                }}
                noWrap
            >
                {section.title}
            </Typography>
        </Box>
    );
}

// ── Droppable column body ──

function ColumnBody({
    typeId,
    sections,
    yearId,
}: {
    typeId: string;
    sections: SectionData[];
    yearId: string;
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: dropId(typeId),
    });

    return (
        <Box
            ref={setNodeRef}
            sx={{
                flex: 1,
                p: "8px",
                backgroundColor: isOver ? p.indigoSoft : p.surface2,
                transition: "background-color 140ms ease",
                minHeight: 48,
            }}
        >
            <SortableContext
                items={sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
            >
                {sections.length === 0 ? (
                    <Typography
                        sx={{
                            fontSize: 12.5,
                            color: isOver ? p.indigo : p.ink3,
                            textAlign: "center",
                            py: 3,
                        }}
                    >
                        {isOver ? "Přetáhněte sem" : "Žádné sekce"}
                    </Typography>
                ) : (
                    sections.map((section) => (
                        <SortableSectionItem
                            key={section.id}
                            section={section}
                            yearId={yearId}
                        />
                    ))
                )}
            </SortableContext>
        </Box>
    );
}

// ── Column (type-level sortable) ──

function TypeColumn({
    type,
    yearId,
    onEdit,
    onDelete,
}: {
    type: SectionTypeData;
    yearId: string;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: colId(type.id) });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <Box
            ref={setNodeRef}
            style={style}
            sx={{
                flex: "1 1 0",
                minWidth: 0,
                backgroundColor: p.surface,
                border: `1px solid ${p.line}`,
                borderRadius: "14px",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
            }}
        >
            {/* head */}
            <Box
                sx={{
                    px: 2,
                    py: 1.5,
                    borderBottom: `1px solid ${p.line}`,
                    background: `linear-gradient(180deg, ${p.surface}, ${p.surface2})`,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                }}
            >
                <Box
                    {...attributes}
                    {...listeners}
                    sx={{
                        display: "flex",
                        cursor: "grab",
                        color: p.ink3,
                        "&:hover": { color: p.ink2 },
                        "&:active": {
                            cursor: "grabbing",
                        },
                        mr: 0.5,
                    }}
                >
                    <DragIndicator
                        sx={{
                            fontSize: 18,
                            transform: "rotate(90deg)",
                        }}
                    />
                </Box>
                <Typography
                    sx={{
                        fontSize: 11,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: p.ink3,
                        fontWeight: 700,
                        flex: 1,
                    }}
                    noWrap
                >
                    {type.label}
                </Typography>
                <Box
                    sx={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        color: p.ink2,
                        backgroundColor: p.surface3,
                        px: "7px",
                        py: "2px",
                        borderRadius: "6px",
                    }}
                >
                    {type.sections.length}
                </Box>
                <Tooltip title="Upravit typ">
                    <IconButton
                        size="small"
                        onClick={onEdit}
                        sx={{
                            color: p.ink3,
                            "&:hover": {
                                color: p.indigo,
                            },
                        }}
                    >
                        <Edit sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Smazat typ">
                    <IconButton
                        size="small"
                        onClick={onDelete}
                        sx={{
                            color: p.ink3,
                            "&:hover": {
                                color: p.negInk,
                            },
                        }}
                    >
                        <Delete sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* body */}
            <ColumnBody
                typeId={type.id}
                sections={type.sections}
                yearId={yearId}
            />

            {/* foot */}
            <Box
                sx={{
                    p: "10px",
                    borderTop: `1px solid ${p.line}`,
                    backgroundColor: p.surface2,
                }}
            >
                <ButtonBase
                    component={Link}
                    href={`/admin/rocniky/${yearId}/sekce/nova/${type.id}`}
                    sx={{
                        width: "100%",
                        py: "10px",
                        px: "12px",
                        backgroundColor: p.surface,
                        border: `1px dashed ${p.line}`,
                        borderRadius: "10px",
                        color: p.indigo,
                        fontSize: 13,
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        transition: "all 140ms ease",
                        "&:hover": {
                            borderColor: p.indigo,
                            backgroundColor: p.indigoSoft,
                        },
                    }}
                >
                    <Add sx={{ fontSize: 16 }} />
                    Přidat sekci
                </ButtonBase>
            </Box>
        </Box>
    );
}

// ── Helpers ──

function findTypeForSection(
    types: SectionTypeData[],
    sectionId: string
): string | null {
    for (const t of types) {
        if (t.sections.some((s) => s.id === sectionId)) {
            return t.id;
        }
    }
    return null;
}

function findSection(
    types: SectionTypeData[],
    sectionId: string
): SectionData | null {
    for (const t of types) {
        const s = t.sections.find((s) => s.id === sectionId);
        if (s) return s;
    }
    return null;
}

// ── Main component ──

export function SectionTypesList({
    yearId,
    sectionTypes,
}: SectionTypesListProps) {
    const dndId = useId();
    const router = useRouter();
    const toast = useToast();
    const [localTypes, setLocalTypes] = useState(sectionTypes);
    const [createOpen, setCreateOpen] = useState(false);
    const [editType, setEditType] = useState<SectionTypeData | null>(null);
    const [deleteType, setDeleteType] = useState<SectionTypeData | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [activeDragSection, setActiveDragSection] =
        useState<SectionData | null>(null);
    const [isDraggingColumn, setIsDraggingColumn] = useState(false);

    const originTypeRef = useRef<string | null>(null);
    const [prevLength, setPrevLength] = useState(sectionTypes.length);

    if (sectionTypes.length !== prevLength) {
        setPrevLength(sectionTypes.length);
        setLocalTypes(sectionTypes);
    }

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // ── Unified drag handlers ──

    const handleDragStart = (event: DragStartEvent) => {
        const activeId = event.active.id as string;

        if (isColId(activeId)) {
            setIsDraggingColumn(true);
            return;
        }

        const section = findSection(localTypes, activeId);
        setActiveDragSection(section);
        originTypeRef.current = findTypeForSection(localTypes, activeId);
    };

    const handleDragOver = (event: DragOverEvent) => {
        if (isDraggingColumn) return;

        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        if (isColId(activeId) || isColId(overId)) return;

        const activeTypeId = findTypeForSection(localTypes, activeId);

        let overTypeId: string | null = null;
        if (isDropId(overId)) {
            overTypeId = parseDropId(overId);
        } else {
            overTypeId = findTypeForSection(localTypes, overId);
        }

        if (!activeTypeId || !overTypeId || activeTypeId === overTypeId) return;

        setLocalTypes((prev) => {
            const sourceType = prev.find((t) => t.id === activeTypeId);
            const destType = prev.find((t) => t.id === overTypeId);
            if (!sourceType || !destType) return prev;

            const item = sourceType.sections.find((s) => s.id === activeId);
            if (!item) return prev;

            const newSource = sourceType.sections.filter(
                (s) => s.id !== activeId
            );

            const overIndex = destType.sections.findIndex(
                (s) => s.id === overId
            );
            const newDest = [...destType.sections];
            if (overIndex >= 0) {
                newDest.splice(overIndex, 0, item);
            } else {
                newDest.push(item);
            }

            return prev.map((t) => {
                if (t.id === activeTypeId)
                    return {
                        ...t,
                        sections: newSource,
                    };
                if (t.id === overTypeId)
                    return {
                        ...t,
                        sections: newDest,
                    };
                return t;
            });
        });
    };

    const handleDragEnd = useCallback(
        async (event: DragEndEvent) => {
            const { active, over } = event;

            // ── Column reorder ──
            if (isDraggingColumn) {
                setIsDraggingColumn(false);
                if (!over) return;

                const activeTypeId = parseColId(active.id as string);
                const overTypeId = parseColId(over.id as string);

                if (activeTypeId !== overTypeId) {
                    const oldIndex = localTypes.findIndex(
                        (t) => t.id === activeTypeId
                    );
                    const newIndex = localTypes.findIndex(
                        (t) => t.id === overTypeId
                    );
                    if (oldIndex >= 0 && newIndex >= 0) {
                        const newTypes = arrayMove(
                            localTypes,
                            oldIndex,
                            newIndex
                        );
                        setLocalTypes(newTypes);
                        const result = await reorderSectionTypes(
                            yearId,
                            newTypes.map((t) => t.id)
                        );
                        if (result.error) toast.error(result.error);
                        else toast.success("Pořadí typů sekcí bylo změněno");
                    }
                }
                return;
            }

            // ── Section reorder / move ──
            setActiveDragSection(null);
            if (!over) return;

            const activeId = active.id as string;
            const overId = over.id as string;

            const currentTypeId = findTypeForSection(localTypes, activeId);
            if (!currentTypeId) return;

            const movedAcross = originTypeRef.current !== currentTypeId;

            if (movedAcross) {
                const destType = localTypes.find((t) => t.id === currentTypeId);
                const result = await moveSection(activeId, currentTypeId);
                if (result.error) {
                    toast.error(result.error);
                    router.refresh();
                } else {
                    toast.success("Sekce byla přesunuta");
                    if (destType) {
                        await reorderSections(
                            currentTypeId,
                            destType.sections.map((s) => s.id)
                        );
                    }
                }
            } else if (activeId !== overId) {
                const type = localTypes.find((t) => t.id === currentTypeId);
                if (type) {
                    const oldIndex = type.sections.findIndex(
                        (s) => s.id === activeId
                    );
                    const newIndex = type.sections.findIndex(
                        (s) => s.id === overId
                    );
                    if (
                        oldIndex >= 0 &&
                        newIndex >= 0 &&
                        oldIndex !== newIndex
                    ) {
                        const newSections = arrayMove(
                            type.sections,
                            oldIndex,
                            newIndex
                        );
                        setLocalTypes((prev) =>
                            prev.map((t) =>
                                t.id === currentTypeId
                                    ? {
                                          ...t,
                                          sections: newSections,
                                      }
                                    : t
                            )
                        );
                        const result = await reorderSections(
                            currentTypeId,
                            newSections.map((s) => s.id)
                        );
                        if (result.error) toast.error(result.error);
                        else toast.success("Pořadí sekcí bylo změněno");
                    }
                }
            }

            originTypeRef.current = null;
        },
        [isDraggingColumn, localTypes, yearId, toast, router]
    );

    // ── Type CRUD ──

    const handleDeleteType = async () => {
        if (!deleteType) return;
        setDeleteLoading(true);
        const result = await deleteSectionType(deleteType.id);
        setDeleteLoading(false);
        setDeleteType(null);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Typ sekce byl smazán");
            router.refresh();
        }
    };

    return (
        <>
            {/* top bar */}
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    mb: 2,
                }}
            >
                <ButtonBase
                    onClick={() => setCreateOpen(true)}
                    sx={{
                        py: "8px",
                        px: "14px",
                        backgroundColor: p.surface,
                        border: `1px dashed ${p.line}`,
                        borderRadius: "10px",
                        color: p.indigo,
                        fontSize: 13,
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 140ms ease",
                        "&:hover": {
                            borderColor: p.indigo,
                            backgroundColor: p.indigoSoft,
                        },
                    }}
                >
                    <Add sx={{ fontSize: 16 }} />
                    Přidat typ sekcí
                </ButtonBase>
            </Box>

            {/* Single DndContext for both columns and sections */}
            <DndContext
                id={dndId}
                sensors={sensors}
                collisionDetection={rectIntersection}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={localTypes.map((t) => colId(t.id))}
                    strategy={horizontalListSortingStrategy}
                >
                    <Box
                        sx={{
                            display: "flex",
                            gap: 2,
                            alignItems: "flex-start",
                        }}
                    >
                        {localTypes.map((type) => (
                            <TypeColumn
                                key={type.id}
                                type={type}
                                yearId={yearId}
                                onEdit={() => setEditType(type)}
                                onDelete={() => setDeleteType(type)}
                            />
                        ))}
                    </Box>
                </SortableContext>

                <DragOverlay dropAnimation={null}>
                    {activeDragSection && (
                        <SectionDragOverlay section={activeDragSection} />
                    )}
                </DragOverlay>
            </DndContext>

            {createOpen && (
                <SectionTypeForm
                    mode="create"
                    yearId={yearId}
                    open={createOpen}
                    onClose={() => setCreateOpen(false)}
                />
            )}

            {editType && (
                <SectionTypeForm
                    mode="edit"
                    yearId={yearId}
                    typeId={editType.id}
                    defaultValues={{
                        label: editType.label,
                        slug: editType.slug,
                        icon: editType.icon,
                        pageTitle: editType.pageTitle,
                        pageSubtitle: editType.pageSubtitle,
                        metaTitle: editType.metaTitle,
                        metaDescription: editType.metaDescription,
                        featuredOnIndex: editType.featuredOnIndex,
                        description: editType.description,
                    }}
                    open={!!editType}
                    onClose={() => setEditType(null)}
                />
            )}

            <Dialog
                open={!!deleteType}
                onClose={() => setDeleteType(null)}
                PaperProps={{ sx: { borderRadius: "14px" } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>
                    Smazat typ sekce?
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Opravdu chcete smazat typ{" "}
                        <strong>
                            &quot;
                            {deleteType?.label}
                            &quot;
                        </strong>
                        ?
                        {(deleteType?.sections.length ?? 0) > 0 && (
                            <>
                                <br />
                                Budou smazány i všechny sekce (
                                {deleteType?.sections.length} ks).
                            </>
                        )}
                        <br />
                        Tato akce je nevratná.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 2 }}>
                    <Button
                        onClick={() => setDeleteType(null)}
                        sx={{
                            color: p.ink2,
                            borderRadius: "10px",
                            border: `1px solid ${p.line}`,
                            "&:hover": {
                                borderColor: p.ink3,
                                backgroundColor: p.surface2,
                            },
                        }}
                    >
                        Zrušit
                    </Button>
                    <Button
                        onClick={handleDeleteType}
                        variant="contained"
                        disableElevation
                        disabled={deleteLoading}
                        sx={{
                            borderRadius: "10px",
                            backgroundColor: p.neg,
                            color: p.negInk,
                            "&:hover": { backgroundColor: "#fecaca" },
                        }}
                    >
                        Smazat
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
