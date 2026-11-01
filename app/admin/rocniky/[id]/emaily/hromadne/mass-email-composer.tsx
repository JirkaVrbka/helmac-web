"use client";

import { useMemo, useState } from "react";
import {
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
} from "@mui/material";
import { ForwardToInbox, Send } from "@mui/icons-material";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import type { RecipientFilter } from "@/lib/validators/email-campaign";
import { TestEmailDialog } from "@/components/admin/test-email-dialog";
import { MassEmailSendConfirmDialog } from "./mass-email-send-confirm-dialog";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

interface EmailAccountOption {
    id: string;
    email: string;
    label: string | null;
    isMain: boolean;
}

interface MassEmailComposerProps {
    yearId: string;
    emailAccounts: EmailAccountOption[];
    availablePlaceholders: { key: string; label: string }[];
}

type RecipientGroup = "all" | "paid" | "unpaid";

const GROUP_OPTIONS: { value: RecipientGroup; label: string }[] = [
    { value: "all", label: "Všichni registrovaní" },
    { value: "paid", label: "Zaplacení" },
    { value: "unpaid", label: "Nezaplacení" },
];

const ghostBtnSx = {
    borderRadius: "10px",
    textTransform: "none",
    border: `1px solid ${p.line}`,
    color: p.ink2,
    backgroundColor: p.surface,
    boxShadow: "none",
    "&:hover": {
        borderColor: p.ink3,
        backgroundColor: p.surface2,
        boxShadow: "none",
    },
};

const indigoBtnSx = {
    borderRadius: "10px",
    textTransform: "none",
    backgroundColor: p.indigo,
    boxShadow: "none",
    "&:hover": { backgroundColor: "#4338ca", boxShadow: "none" },
};

export function MassEmailComposer({
    yearId,
    emailAccounts,
    availablePlaceholders,
}: MassEmailComposerProps) {
    const [group, setGroup] = useState<RecipientGroup>("all");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [accountId, setAccountId] = useState("");
    const [testOpen, setTestOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const canSend = subject.trim().length > 0 && body.trim().length > 0;

    // Placeholders actually referenced in the subject/body, so the test dialog
    // can offer a sample-value field for each one.
    const usedPlaceholders = useMemo(() => {
        const haystack = `${subject}\n${body}`;
        const keys = new Set<string>();
        for (const match of haystack.matchAll(/\{(\w+)\}/g)) {
            keys.add(match[1]);
        }
        const labelByKey = new Map(
            availablePlaceholders.map((ph) => [ph.key, ph.label])
        );
        return Array.from(keys).map((k) => ({
            key: k,
            label: labelByKey.get(k) ?? k,
        }));
    }, [subject, body, availablePlaceholders]);

    const filter: RecipientFilter = {
        statuses: ["PENDING", "CONFIRMED", "WAITLIST"],
        paid: group,
    };
    const groupLabel =
        GROUP_OPTIONS.find((o) => o.value === group)?.label ?? "";

    return (
        <Box
            sx={{
                backgroundColor: p.surface,
                border: `1px solid ${p.line}`,
                borderRadius: "14px",
                p: 2.5,
                mb: 3.5,
            }}
        >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 1.5,
                        flexWrap: "wrap",
                    }}
                >
                    <Button
                        variant="outlined"
                        startIcon={<ForwardToInbox />}
                        onClick={() => setTestOpen(true)}
                        disabled={!canSend}
                        sx={ghostBtnSx}
                    >
                        Testovací odeslání
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<Send />}
                        onClick={() => setConfirmOpen(true)}
                        disabled={!canSend}
                        sx={indigoBtnSx}
                    >
                        Odeslat
                    </Button>
                </Box>

                <FormControl fullWidth size="small" sx={builderFieldSx}>
                    <InputLabel>Komu odeslat</InputLabel>
                    <Select
                        value={group}
                        onChange={(e) =>
                            setGroup(e.target.value as RecipientGroup)
                        }
                        label="Komu odeslat"
                    >
                        {GROUP_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl fullWidth size="small" sx={builderFieldSx}>
                    <InputLabel shrink>Odesílatel</InputLabel>
                    <Select
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        label="Odesílatel"
                        displayEmpty
                        notched
                    >
                        <MenuItem value="">Hlavní emailový účet</MenuItem>
                        {emailAccounts.map((account) => (
                            <MenuItem key={account.id} value={account.id}>
                                {account.email}
                                {account.label ? ` (${account.label})` : ""}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <TextField
                    label="Předmět"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    fullWidth
                    size="small"
                    sx={builderFieldSx}
                />

                <Box>
                    <Typography
                        sx={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: p.ink2,
                            mb: 1,
                        }}
                    >
                        Text emailu
                    </Typography>
                    <RichTextEditor
                        value={body}
                        onChange={setBody}
                        format="html"
                        minHeight={300}
                        yearId={yearId}
                    />
                </Box>
            </Box>

            <TestEmailDialog
                open={testOpen}
                onClose={() => setTestOpen(false)}
                subject={subject}
                body={body}
                bcc={null}
                emailAccountId={accountId || null}
                usedPlaceholders={usedPlaceholders}
            />
            <MassEmailSendConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                yearId={yearId}
                filter={filter}
                groupLabel={groupLabel}
                subject={subject.trim()}
                body={body}
                accountId={accountId || null}
            />
        </Box>
    );
}
