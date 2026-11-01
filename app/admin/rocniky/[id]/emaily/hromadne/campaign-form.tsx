"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    FormControl,
    InputLabel,
    ListItemText,
    MenuItem,
    Select,
    TextField,
    Typography,
} from "@mui/material";
import { Preview, Save } from "@mui/icons-material";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import {
    createCampaign,
    previewRecipients,
    updateCampaign,
} from "@/lib/actions/email-campaigns";
import type { RecipientFilter } from "@/lib/validators/email-campaign";
import { REGISTRATION_STATUS_OPTIONS } from "./campaign-status";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

interface EmailAccountOption {
    id: string;
    email: string;
    label: string | null;
    isMain: boolean;
}

interface CampaignFormProps {
    yearId: string;
    emailAccounts: EmailAccountOption[];
    availablePlaceholders: { key: string; label: string }[];
    campaign?: {
        id: string;
        name: string;
        subject: string;
        body: string;
        bcc: string | null;
        accountId: string | null;
        recipientFilter: RecipientFilter;
    };
}

const ALL_STATUSES = REGISTRATION_STATUS_OPTIONS.map((s) => s.value);

const kickerSx = {
    fontSize: 11,
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    fontWeight: 700,
    color: p.ink3,
};

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

export function CampaignForm({
    yearId,
    emailAccounts,
    availablePlaceholders,
    campaign,
}: CampaignFormProps) {
    const router = useRouter();
    const [name, setName] = useState(campaign?.name ?? "");
    const [subject, setSubject] = useState(campaign?.subject ?? "");
    const [body, setBody] = useState(campaign?.body ?? "");
    const [bcc, setBcc] = useState(campaign?.bcc ?? "");
    const [accountId, setAccountId] = useState(campaign?.accountId ?? "");
    const [statuses, setStatuses] = useState<string[]>(
        campaign?.recipientFilter.statuses ?? ALL_STATUSES
    );
    const [paid, setPaid] = useState<"all" | "paid" | "unpaid">(
        campaign?.recipientFilter.paid ?? "all"
    );
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<{
        count: number;
        sample: string[];
    } | null>(null);
    const [isSaving, startSaving] = useTransition();
    const [isPreviewing, startPreviewing] = useTransition();

    const filter: RecipientFilter = {
        statuses: statuses as RecipientFilter["statuses"],
        paid,
    };

    const handlePreview = () => {
        setError(null);
        startPreviewing(async () => {
            const result = await previewRecipients(yearId, filter);
            if (result.error) {
                setError(result.error);
                setPreview(null);
                return;
            }
            setPreview({
                count: result.count ?? 0,
                sample: result.sample ?? [],
            });
        });
    };

    const handleSave = () => {
        setError(null);
        startSaving(async () => {
            const input = {
                name: name.trim(),
                subject: subject.trim(),
                body,
                bcc: bcc.trim() || null,
                accountId: accountId || null,
                recipientFilter: filter,
            };

            const result = campaign
                ? await updateCampaign(campaign.id, input)
                : await createCampaign(yearId, input);

            if (result.error) {
                setError(result.error);
                return;
            }

            if (!campaign && "id" in result && result.id) {
                router.push(
                    `/admin/rocniky/${yearId}/emaily/hromadne/${result.id}`
                );
            }
            router.refresh();
        });
    };

    return (
        <Box
            sx={{
                backgroundColor: p.surface,
                border: `1px solid ${p.line}`,
                borderRadius: "14px",
                p: 2.5,
                mb: 3,
            }}
        >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <TextField
                    label="Název"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="např. Informace před akcí"
                    disabled={isSaving}
                    sx={builderFieldSx}
                />

                <Typography sx={kickerSx}>Příjemci</Typography>

                <FormControl
                    fullWidth
                    size="small"
                    disabled={isSaving}
                    sx={builderFieldSx}
                >
                    <InputLabel>Stavy registrací</InputLabel>
                    <Select
                        multiple
                        value={statuses}
                        onChange={(e) => {
                            const value = e.target.value;
                            setStatuses(
                                typeof value === "string"
                                    ? value.split(",")
                                    : value
                            );
                            setPreview(null);
                        }}
                        label="Stavy registrací"
                        renderValue={(selected) =>
                            selected
                                .map(
                                    (v) =>
                                        REGISTRATION_STATUS_OPTIONS.find(
                                            (o) => o.value === v
                                        )?.label ?? v
                                )
                                .join(", ")
                        }
                    >
                        {REGISTRATION_STATUS_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                                <Checkbox
                                    checked={statuses.includes(option.value)}
                                />
                                <ListItemText primary={option.label} />
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl
                    fullWidth
                    size="small"
                    disabled={isSaving}
                    sx={builderFieldSx}
                >
                    <InputLabel>Platba</InputLabel>
                    <Select
                        value={paid}
                        onChange={(e) => {
                            setPaid(
                                e.target.value as "all" | "paid" | "unpaid"
                            );
                            setPreview(null);
                        }}
                        label="Platba"
                    >
                        <MenuItem value="all">Všichni</MenuItem>
                        <MenuItem value="paid">Pouze zaplacené</MenuItem>
                        <MenuItem value="unpaid">Pouze nezaplacené</MenuItem>
                    </Select>
                </FormControl>

                <Box>
                    <Button
                        variant="outlined"
                        startIcon={
                            isPreviewing ? (
                                <CircularProgress size={18} />
                            ) : (
                                <Preview />
                            )
                        }
                        onClick={handlePreview}
                        disabled={isPreviewing || statuses.length === 0}
                        sx={ghostBtnSx}
                    >
                        Náhled příjemců
                    </Button>
                    {preview && (
                        <Box sx={{ mt: 2 }}>
                            <Typography
                                variant="body2"
                                sx={{ mb: 1, color: p.ink2 }}
                            >
                                Počet příjemců: <strong>{preview.count}</strong>
                            </Typography>
                            <Box
                                sx={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 0.75,
                                }}
                            >
                                {preview.sample.map((email) => (
                                    <Box
                                        key={email}
                                        component="span"
                                        sx={{
                                            fontFamily:
                                                "'JetBrains Mono', monospace",
                                            fontSize: 12,
                                            px: "9px",
                                            py: "3px",
                                            borderRadius: "7px",
                                            backgroundColor: p.indigoSoft,
                                            color: p.indigoInk,
                                        }}
                                    >
                                        {email}
                                    </Box>
                                ))}
                                {preview.count > preview.sample.length && (
                                    <Box
                                        component="span"
                                        sx={{
                                            fontSize: 12,
                                            px: "9px",
                                            py: "3px",
                                            borderRadius: "7px",
                                            border: `1px solid ${p.line}`,
                                            color: p.ink2,
                                        }}
                                    >
                                        +{" "}
                                        {preview.count - preview.sample.length}{" "}
                                        dalších
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    )}
                </Box>

                <Typography sx={kickerSx}>Obsah emailu</Typography>

                <FormControl
                    fullWidth
                    size="small"
                    disabled={isSaving}
                    sx={builderFieldSx}
                >
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
                    disabled={isSaving}
                    sx={builderFieldSx}
                />

                <TextField
                    label="Skrytá kopie (BCC)"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    fullWidth
                    size="small"
                    disabled={isSaving}
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
                        placeholders={availablePlaceholders}
                    />
                </Box>

                {error && <Alert severity="error">{error}</Alert>}

                <Box>
                    <Button
                        variant="contained"
                        disableElevation
                        startIcon={
                            isSaving ? <CircularProgress size={18} /> : <Save />
                        }
                        onClick={handleSave}
                        disabled={
                            isSaving ||
                            !name.trim() ||
                            !subject.trim() ||
                            !body.trim() ||
                            statuses.length === 0
                        }
                        sx={indigoBtnSx}
                    >
                        {campaign ? "Uložit změny" : "Vytvořit koncept"}
                    </Button>
                </Box>
            </Box>
        </Box>
    );
}
