"use client";

import { Box, Typography } from "@mui/material";
import { useDroppable } from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { FieldExternalUsage } from "@/lib/utils/condition-validation";
import type {
    FormCondition,
    FormField,
    InputField,
    PricingDefinition,
} from "@/lib/types/registration-form";
import { isInputField } from "@/lib/types/registration-form";
import { FieldListItem } from "./field-list-item";
import { SortableFieldItem } from "./sortable-field-item";
import { BlockHeaderRow } from "./block-header-row";
import { EmptyBlockDropZone } from "./empty-block-drop-zone";
import { Fragment } from "react";
import { flatElementId, type FlatElement } from "./form-data-adapter";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface Props {
    elements: FlatElement[];
    conditions: FormCondition[];
    pricingDefinitions: PricingDefinition[];
    usedFieldIds: Set<string>;
    fieldExternalUsages: Map<string, FieldExternalUsage[]>;
    readOnly?: boolean;
    activeId: string | null;
    onEditField: (field: FormField) => void;
    onDeleteField: (fieldId: string) => void;
    onDeleteBlock: (blockId: string) => void;
    onPatchField: (fieldId: string, patch: Partial<InputField>) => void;
    onCreateCondition: (
        fieldId: string,
        fieldLabel: string,
        optionValue: string
    ) => void;
}

export function FormBuilderCanvas({
    elements,
    conditions,
    pricingDefinitions,
    usedFieldIds,
    fieldExternalUsages,
    readOnly = false,
    activeId,
    onEditField,
    onDeleteField,
    onDeleteBlock,
    onPatchField,
    onCreateCondition,
}: Props) {
    const sortableIds = elements.map(flatElementId);

    return (
        <Box
            sx={{
                pointerEvents: readOnly ? "none" : undefined,
                userSelect: readOnly ? "text" : undefined,
            }}
        >
            <SortableContext
                items={sortableIds}
                strategy={verticalListSortingStrategy}
            >
                <RootDropZone isEmpty={elements.length === 0}>
                    {elements.map((el, i) => {
                        const next = elements[i + 1];
                        if (el.kind === "block") {
                            const hasChildBelow =
                                next?.kind === "field" &&
                                next.data.parentBlockId === el.data.id;
                            return (
                                <Fragment key={el.data.id}>
                                    <SortableFieldItem
                                        id={el.data.id}
                                        blockPosition="block-head"
                                    >
                                        <BlockHeaderRow
                                            blockId={el.data.id}
                                            condition={conditions.find(
                                                (c) =>
                                                    c.id === el.data.conditionId
                                            )}
                                            onDeleteBlock={onDeleteBlock}
                                        />
                                    </SortableFieldItem>
                                    {!hasChildBelow && (
                                        <EmptyBlockDropZone
                                            blockId={el.data.id}
                                        />
                                    )}
                                </Fragment>
                            );
                        }
                        const parentId = el.data.parentBlockId;
                        const isInsideBlock = parentId !== null;
                        const isLastInGroup =
                            isInsideBlock &&
                            (next === undefined ||
                                next.kind === "block" ||
                                (next.kind === "field" &&
                                    next.data.parentBlockId !== parentId));
                        const blockPosition = !isInsideBlock
                            ? "standalone"
                            : isLastInGroup
                              ? "block-tail"
                              : "block-middle";
                        return (
                            <SortableFieldItem
                                key={el.data.field.id}
                                id={el.data.field.id}
                                blockPosition={blockPosition}
                                parentBeingDragged={
                                    isInsideBlock && activeId === parentId
                                }
                            >
                                <FieldListItem
                                    field={el.data.field}
                                    onEdit={onEditField}
                                    onDelete={onDeleteField}
                                    onToggleField={
                                        isInputField(el.data.field)
                                            ? onPatchField
                                            : undefined
                                    }
                                    usedInCondition={usedFieldIds.has(
                                        el.data.field.id
                                    )}
                                    pricingDefinitions={pricingDefinitions}
                                    onCreateCondition={onCreateCondition}
                                    externalUsages={fieldExternalUsages.get(
                                        el.data.field.id
                                    )}
                                />
                            </SortableFieldItem>
                        );
                    })}
                </RootDropZone>
            </SortableContext>
        </Box>
    );
}

function RootDropZone({
    isEmpty,
    children,
}: {
    isEmpty: boolean;
    children: React.ReactNode;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: "root-droppable" });
    return (
        <Box
            ref={setNodeRef}
            sx={{
                minHeight: 100,
                border: `1px ${isEmpty || isOver ? "dashed" : "solid"} ${
                    isOver ? p.indigo : p.line
                }`,
                borderRadius: "14px",
                backgroundColor: isOver ? p.indigoSoft : p.surface2,
                transition: "all 140ms ease",
                p: 1.5,
            }}
        >
            {isEmpty ? (
                <Typography sx={{ textAlign: "center", py: 4, color: p.ink3 }}>
                    Formulář je prázdný. Přetáhněte pole z palety nebo použijte
                    tlačítko.
                </Typography>
            ) : (
                children
            )}
        </Box>
    );
}
