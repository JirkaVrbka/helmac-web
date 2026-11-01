"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Typography,
} from "@mui/material";
import { Delete, ForwardToInbox } from "@mui/icons-material";
import { LinkButton } from "@/components/ui/link-button";
import { EmailToggle } from "./email-toggle";
import {
    toggleConditionalEmail,
    deleteConditionalEmail,
} from "@/lib/actions/conditional-emails";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface ConditionalEmailCardProps {
    yearId: string;
    email: {
        id: string;
        name: string;
        enabled: boolean;
        conditionFieldName: string;
        conditionFieldLabel: string;
        conditionOperator: string;
        conditionValue: string | null;
        subject: string | null;
        body: string | null;
        account: { email: string; label: string | null } | null;
    };
}

function renderConditionText(
    label: string,
    operator: string,
    value: string | null
): string {
    if (operator === "is_set") return `${label} – cokoli vybráno`;
    if (operator === "is_not_set") return `${label} – nic nevybráno`;
    if (operator === "quantity_gt_zero")
        return `${label} – počet pro "${value ?? ""}" > 0`;
    if (operator === "quantity_any_gt_zero")
        return `${label} – jakákoli volba > 0`;
    return `${label} = "${value ?? ""}"`;
}

function SenderInfo({
    account,
}: {
    account: { email: string; label: string | null } | null;
}) {
    if (account) {
        return (
            <Typography variant="body2" sx={{ mt: 1, color: p.ink2 }}>
                Odesílatel: {account.email}
                {account.label ? ` (${account.label})` : ""}
            </Typography>
        );
    }
    return (
        <Typography variant="body2" sx={{ mt: 1, color: p.ink2 }}>
            Odesílatel: Hlavní emailový účet
        </Typography>
    );
}

export function ConditionalEmailCard({
    yearId,
    email,
}: ConditionalEmailCardProps) {
    const router = useRouter();
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const hasTemplate = !!email.subject && !!email.body;

    const handleDelete = () => {
        setError(null);
        startTransition(async () => {
            const result = await deleteConditionalEmail(email.id);
            if (result && "error" in result && result.error) {
                setError(
                    typeof result.error === "string"
                        ? result.error
                        : "Nepodařilo se smazat email"
                );
                setDeleteOpen(false);
                return;
            }
            setDeleteOpen(false);
            router.refresh();
        });
    };

    const toggleAction = async (_yearId: string, enabled: boolean) => {
        return toggleConditionalEmail(email.id, enabled);
    };

    return (
        <>
            <Card
                elevation={0}
                sx={{
                    mb: 3,
                    border: `1px solid ${p.line}`,
                    borderRadius: "14px",
                    backgroundColor: p.surface,
                }}
            >
                <CardContent>
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                        }}
                    >
                        <Box>
                            <Typography
                                variant="h6"
                                sx={{ mb: 1, color: p.ink }}
                            >
                                {email.name}
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{ mb: 2, color: p.ink2 }}
                            >
                                Podmínka:{" "}
                                {renderConditionText(
                                    email.conditionFieldLabel,
                                    email.conditionOperator,
                                    email.conditionValue
                                )}
                            </Typography>
                        </Box>
                        <Button
                            size="small"
                            startIcon={<Delete />}
                            onClick={() => setDeleteOpen(true)}
                            disabled={isPending}
                            sx={{
                                color: p.negInk,
                                borderRadius: "10px",
                                textTransform: "none",
                                "&:hover": { backgroundColor: p.neg },
                            }}
                        >
                            Smazat
                        </Button>
                    </Box>

                    <EmailToggle
                        yearId={yearId}
                        initialEnabled={email.enabled}
                        hasTemplate={hasTemplate}
                        toggleAction={toggleAction}
                        label="Odesílat tento podmíněný email"
                    />

                    {!hasTemplate && (
                        <Typography
                            variant="body2"
                            sx={{ mt: 1, mb: 2, color: p.ink2 }}
                        >
                            Šablona emailu zatím není nastavena.
                        </Typography>
                    )}

                    {hasTemplate && <SenderInfo account={email.account} />}

                    <Box sx={{ mt: 2 }}>
                        <LinkButton
                            href={`/admin/rocniky/${yearId}/emaily/podmineny/${email.id}`}
                            variant="outlined"
                            startIcon={<ForwardToInbox />}
                            sx={{
                                color: p.ink2,
                                borderRadius: "10px",
                                borderColor: p.line,
                                "&:hover": {
                                    borderColor: p.ink3,
                                    backgroundColor: p.surface2,
                                },
                            }}
                        >
                            {hasTemplate
                                ? "Zobrazit šablonu"
                                : "Nastavit šablonu"}
                        </LinkButton>
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {error}
                        </Alert>
                    )}
                </CardContent>
            </Card>

            <Dialog
                open={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                PaperProps={{ sx: { borderRadius: "14px" } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>
                    Smazat podmíněný email
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Opravdu chcete smazat podmíněný email &quot;{email.name}
                        &quot;? Tato akce je nevratná.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 2 }}>
                    <Button
                        onClick={() => setDeleteOpen(false)}
                        disabled={isPending}
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
                        onClick={handleDelete}
                        disabled={isPending}
                        disableElevation
                        variant="contained"
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
