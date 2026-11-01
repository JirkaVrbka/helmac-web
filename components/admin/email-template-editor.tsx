"use client";

import { useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    IconButton,
    Tooltip,
    Typography,
} from "@mui/material";
import {
    Save,
    Send,
    ArrowUpward,
    ArrowDownward,
    ContentCopy,
    DeleteOutline,
} from "@mui/icons-material";
import { updateEmailTemplate } from "@/lib/actions/years";
import { TestEmailDialog } from "@/components/admin/test-email-dialog";
import {
    SectionRail,
    BASE_SECTION_ID,
    type RailItem,
} from "@/components/admin/email-builder/section-rail";
import { SectionPaneBase } from "@/components/admin/email-builder/section-pane-base";
import { SectionPaneConditional } from "@/components/admin/email-builder/section-pane-conditional";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import type { EmailConditionalSection } from "@/lib/types/email-sections";
import type {
    FormField,
    PricingDefinition,
} from "@/lib/types/registration-form";
import type { EmailAttachment } from "@/lib/validators/email-attachment";

type SaveAction = (
    yearId: string,
    formData: FormData
) => Promise<{ success?: boolean; error?: string | Record<string, string[]> }>;

interface EmailAccountOption {
    id: string;
    email: string;
    label: string | null;
    isMain: boolean;
}

interface EmailTemplateEditorProps {
    yearId: string;
    confirmationEmailSubject: string | null;
    confirmationEmailBody: string | null;
    confirmationEmailBcc: string | null;
    availablePlaceholders: { key: string; label: string }[];
    saveAction?: SaveAction;
    emailAccounts?: EmailAccountOption[];
    selectedEmailAccountId?: string | null;
    initialSections?: EmailConditionalSection[];
    initialAttachments?: EmailAttachment[];
    availableFields?: FormField[];
    pricingDefinitions?: PricingDefinition[];
}

function snapshotKey(input: {
    subject: string;
    body: string;
    bcc: string;
    emailAccountId: string;
    sections: EmailConditionalSection[];
    attachments: EmailAttachment[];
}): string {
    return JSON.stringify({
        subject: input.subject,
        body: input.body,
        bcc: input.bcc,
        emailAccountId: input.emailAccountId,
        sections: [...input.sections]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((s) => ({ ...s, sortOrder: s.sortOrder })),
        attachments: [...input.attachments]
            .map((a) => ({
                url: a.url,
                filename: a.filename,
                size: a.size,
                contentType: a.contentType,
            }))
            .sort((a, b) => a.url.localeCompare(b.url)),
    });
}

function reindexSections(
    sections: EmailConditionalSection[]
): EmailConditionalSection[] {
    return [...sections]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((s, i) => ({ ...s, sortOrder: i }));
}

export function EmailTemplateEditor({
    yearId,
    confirmationEmailSubject: initialSubject,
    confirmationEmailBody: initialBody,
    confirmationEmailBcc: initialBcc,
    availablePlaceholders,
    saveAction = updateEmailTemplate,
    emailAccounts = [],
    selectedEmailAccountId: initialEmailAccountId,
    initialSections = [],
    initialAttachments = [],
    availableFields = [],
    pricingDefinitions = [],
}: EmailTemplateEditorProps) {
    const initial = useMemo(
        () => ({
            subject: initialSubject ?? "",
            body: initialBody ?? "",
            bcc: initialBcc ?? "",
            emailAccountId: initialEmailAccountId ?? "",
            sections: reindexSections(initialSections),
            attachments: initialAttachments,
        }),
        // we intentionally capture the initial values exactly once at mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    const [subject, setSubject] = useState(initial.subject);
    const [body, setBody] = useState(initial.body);
    const [bcc, setBcc] = useState(initial.bcc);
    const [emailAccountId, setEmailAccountId] = useState(
        initial.emailAccountId
    );
    const [sections, setSections] = useState<EmailConditionalSection[]>(
        initial.sections
    );
    const [attachments, setAttachments] = useState<EmailAttachment[]>(
        initial.attachments
    );
    const [activeId, setActiveId] = useState<string>(BASE_SECTION_ID);
    const [savedSnapshot, setSavedSnapshot] = useState<string>(() =>
        snapshotKey(initial)
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>(
        {}
    );
    const [success, setSuccess] = useState(false);
    const [testOpen, setTestOpen] = useState(false);

    const sortedSections = useMemo(
        () => [...sections].sort((a, b) => a.sortOrder - b.sortOrder),
        [sections]
    );

    const railItems: RailItem[] = useMemo(() => {
        const items: RailItem[] = [{ kind: "base", id: BASE_SECTION_ID, body }];
        for (const s of sortedSections)
            items.push({ kind: "section", id: s.id, section: s });
        return items;
    }, [body, sortedSections]);

    const currentKey = snapshotKey({
        subject,
        body,
        bcc,
        emailAccountId,
        sections,
        attachments,
    });
    const dirty = currentKey !== savedSnapshot;

    const usedPlaceholders = useMemo(() => {
        const sectionBodies = sections.map((s) => s.body).join("\n");
        const haystack = `${subject}\n${body}\n${sectionBodies}`;
        const keys = new Set<string>();
        for (const match of haystack.matchAll(/\{(\w+)\}/g)) {
            keys.add(match[1]);
        }
        for (const section of sections) {
            for (const rule of section.condition.rules) {
                const fieldId = rule.fieldId;
                if (!fieldId) continue;
                const field = availableFields.find((f) => f.id === fieldId);
                if (field && "name" in field && field.name) {
                    keys.add(field.name);
                }
            }
        }
        const labelByKey = new Map(
            availablePlaceholders.map((ph) => [ph.key, ph.label])
        );
        return Array.from(keys)
            .filter((k) => k !== "qrPlatba")
            .map((k) => ({ key: k, label: labelByKey.get(k) ?? k }));
    }, [subject, body, sections, availableFields, availablePlaceholders]);

    const canTest = !!subject || !!body;

    const activeSection =
        activeId === BASE_SECTION_ID
            ? null
            : (sortedSections.find((s) => s.id === activeId) ?? null);
    const activeConditionalIndex = activeSection
        ? sortedSections.findIndex((s) => s.id === activeSection.id)
        : -1;

    const updateSection = (next: EmailConditionalSection) => {
        setSections((prev) => prev.map((s) => (s.id === next.id ? next : s)));
    };

    const addSection = () => {
        const id = crypto.randomUUID();
        const newSection: EmailConditionalSection = {
            id,
            condition: {
                id: crypto.randomUUID(),
                name: "",
                rules: [
                    {
                        type: "field_value",
                        fieldId: "",
                        operator: "equals",
                        value: "",
                    },
                ],
            },
            body: "",
            sortOrder: sortedSections.length,
            attachments: [],
        };
        setSections((prev) => [...prev, newSection]);
        setActiveId(id);
    };

    const duplicateActive = () => {
        if (!activeSection) return;
        const newId = crypto.randomUUID();
        const idx = activeConditionalIndex;
        const insertAt = idx + 1;
        const copy: EmailConditionalSection = {
            id: newId,
            condition: {
                id: crypto.randomUUID(),
                name: activeSection.condition.name,
                rules: activeSection.condition.rules.map((r) => ({ ...r })),
            },
            body: activeSection.body,
            sortOrder: insertAt,
            attachments: [...(activeSection.attachments ?? [])],
        };
        const updated = sortedSections.slice();
        updated.splice(insertAt, 0, copy);
        setSections(reindexSections(updated));
        setActiveId(newId);
    };

    const moveActive = (dir: -1 | 1) => {
        if (!activeSection) return;
        const idx = activeConditionalIndex;
        const target = idx + dir;
        if (target < 0 || target >= sortedSections.length) return;
        const updated = sortedSections.slice();
        [updated[idx], updated[target]] = [updated[target], updated[idx]];
        setSections(updated.map((s, i) => ({ ...s, sortOrder: i })));
    };

    const deleteActive = () => {
        if (!activeSection) return;
        const idx = activeConditionalIndex;
        const remaining = sortedSections.filter(
            (s) => s.id !== activeSection.id
        );
        setSections(reindexSections(remaining));
        const fallback = remaining[idx] ?? remaining[idx - 1];
        setActiveId(fallback ? fallback.id : BASE_SECTION_ID);
    };

    const saveAll = async () => {
        setSaving(true);
        setError(null);
        setFieldErrors({});
        setSuccess(false);

        const formData = new FormData();
        formData.set("confirmationEmailSubject", subject);
        formData.set("confirmationEmailBody", body);
        formData.set("confirmationEmailBcc", bcc);
        if (emailAccountId) {
            formData.set("emailAccountId", emailAccountId);
        }
        formData.set("sectionsJson", JSON.stringify(sections));
        formData.set("attachmentsJson", JSON.stringify(attachments));

        const result = await saveAction(yearId, formData);

        if (result && "error" in result && result.error) {
            if (typeof result.error === "string") {
                setError(result.error);
            } else {
                const errObj = result.error as Record<
                    string,
                    string[] | undefined
                >;
                if (errObj._form?.[0]) {
                    setError(errObj._form[0]);
                } else {
                    setFieldErrors(errObj as Record<string, string[]>);
                    setActiveId(BASE_SECTION_ID);
                }
            }
        } else {
            setSavedSnapshot(
                snapshotKey({
                    subject,
                    body,
                    bcc,
                    emailAccountId,
                    sections,
                    attachments,
                })
            );
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        }

        setSaving(false);
    };

    const totalConditional = sortedSections.length;

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Top bar */}
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    p: "12px 18px",
                    backgroundColor: p.surface,
                    border: `1px solid ${p.line}`,
                    borderRadius: "12px",
                }}
            >
                <SaveStatePill dirty={dirty} saving={saving} />
                <Box sx={{ flex: 1 }} />
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Send sx={{ fontSize: 16 }} />}
                    onClick={() => setTestOpen(true)}
                    disabled={!canTest}
                >
                    Testovací odeslání
                </Button>
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<Save sx={{ fontSize: 16 }} />}
                    onClick={saveAll}
                    disabled={saving || !dirty}
                    sx={{
                        backgroundColor: p.indigo,
                        "&:hover": { backgroundColor: "#4338ca" },
                    }}
                >
                    {saving ? "Ukládání..." : "Uložit šablonu"}
                </Button>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">Šablona byla uložena</Alert>}

            {/* Workspace */}
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: "320px 1fr",
                    gap: 2,
                    minHeight: "calc(100dvh - 280px)",
                }}
            >
                <SectionRail
                    items={railItems}
                    activeId={activeId}
                    onSelect={setActiveId}
                    onAdd={addSection}
                    availableFields={availableFields}
                    pricingDefinitions={pricingDefinitions}
                />

                <Box
                    sx={{
                        backgroundColor: p.surface,
                        border: `1px solid ${p.line}`,
                        borderRadius: "14px",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        minHeight: 0,
                    }}
                >
                    {/* Pane head */}
                    <PaneHead
                        index={
                            activeId === BASE_SECTION_ID
                                ? 0
                                : activeConditionalIndex + 1
                        }
                        isBase={activeId === BASE_SECTION_ID}
                        canMoveUp={activeConditionalIndex > 0}
                        canMoveDown={
                            activeConditionalIndex >= 0 &&
                            activeConditionalIndex < totalConditional - 1
                        }
                        onMoveUp={() => moveActive(-1)}
                        onMoveDown={() => moveActive(1)}
                        onDuplicate={duplicateActive}
                        onDelete={deleteActive}
                    />

                    {/* Pane body */}
                    <Box
                        sx={{ flex: 1, overflowY: "auto", p: "22px 26px 28px" }}
                    >
                        {activeId === BASE_SECTION_ID ? (
                            <SectionPaneBase
                                subject={subject}
                                body={body}
                                bcc={bcc}
                                emailAccountId={emailAccountId}
                                emailAccounts={emailAccounts}
                                placeholders={availablePlaceholders}
                                fieldErrors={fieldErrors}
                                attachments={attachments}
                                onSubjectChange={setSubject}
                                onBodyChange={setBody}
                                onBccChange={setBcc}
                                onEmailAccountIdChange={setEmailAccountId}
                                onAttachmentsChange={setAttachments}
                            />
                        ) : activeSection ? (
                            <SectionPaneConditional
                                key={activeSection.id}
                                section={activeSection}
                                allFields={availableFields}
                                pricingDefinitions={pricingDefinitions}
                                placeholders={availablePlaceholders}
                                onChange={updateSection}
                            />
                        ) : (
                            <Typography color="text.secondary">
                                Sekce neexistuje.
                            </Typography>
                        )}
                    </Box>
                </Box>
            </Box>

            <TestEmailDialog
                open={testOpen}
                onClose={() => setTestOpen(false)}
                subject={subject}
                body={body}
                bcc={bcc || null}
                emailAccountId={emailAccountId || null}
                usedPlaceholders={usedPlaceholders}
                sections={sections}
                availableFields={availableFields}
                attachments={attachments}
            />
        </Box>
    );
}

function SaveStatePill({ dirty, saving }: { dirty: boolean; saving: boolean }) {
    const label = saving
        ? "Ukládá se..."
        : dirty
          ? "Neuložené změny"
          : "Změny uloženy";
    const bg = saving ? p.warnSoft : dirty ? p.warnSoft : p.value;
    const fg = saving ? p.warnInk : dirty ? p.warnInk : p.valueInk;
    const dot = saving ? p.warnInk : dirty ? p.or : p.valueInk;

    return (
        <Box
            sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.75,
                backgroundColor: bg,
                color: fg,
                px: "10px",
                py: "4px",
                borderRadius: "999px",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.04em",
            }}
        >
            <Box
                sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: dot,
                }}
            />
            {label}
        </Box>
    );
}

interface PaneHeadProps {
    index: number;
    isBase: boolean;
    canMoveUp: boolean;
    canMoveDown: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
}

function PaneHead({
    index,
    isBase,
    canMoveUp,
    canMoveDown,
    onMoveUp,
    onMoveDown,
    onDuplicate,
    onDelete,
}: PaneHeadProps) {
    const label = String(index + 1).padStart(2, "0");
    const title = isBase ? `Sekce ${label}` : `Sekce ${label}`;
    const hint = isBase
        ? "— základní text, posílá se vždy"
        : "— odešle se, pokud platí pravidla";

    return (
        <Box
            sx={{
                px: "22px",
                py: "16px",
                borderBottom: `1px solid ${p.line}`,
                display: "flex",
                alignItems: "center",
                gap: 1.75,
                background: `linear-gradient(180deg, ${p.surface}, ${p.surface2})`,
            }}
        >
            <Box
                sx={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 14,
                    fontWeight: 700,
                    color: p.indigo,
                    backgroundColor: p.indigoSoft,
                    width: 32,
                    height: 32,
                    borderRadius: "8px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                }}
            >
                {label}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    sx={{
                        fontSize: 16,
                        fontWeight: 700,
                        letterSpacing: "-0.01em",
                    }}
                >
                    {title}
                    <Box
                        component="span"
                        sx={{
                            ml: "10px",
                            color: p.ink3,
                            fontWeight: 400,
                            fontSize: 12,
                        }}
                    >
                        {hint}
                    </Box>
                </Typography>
            </Box>
            {!isBase && (
                <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Tooltip title="Posunout nahoru">
                        <span>
                            <IconButton
                                size="small"
                                onClick={onMoveUp}
                                disabled={!canMoveUp}
                            >
                                <ArrowUpward sx={{ fontSize: 18 }} />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="Posunout dolů">
                        <span>
                            <IconButton
                                size="small"
                                onClick={onMoveDown}
                                disabled={!canMoveDown}
                            >
                                <ArrowDownward sx={{ fontSize: 18 }} />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="Duplikovat">
                        <IconButton size="small" onClick={onDuplicate}>
                            <ContentCopy sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Smazat sekci">
                        <IconButton
                            size="small"
                            color="error"
                            onClick={onDelete}
                        >
                            <DeleteOutline sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Tooltip>
                </Box>
            )}
        </Box>
    );
}
