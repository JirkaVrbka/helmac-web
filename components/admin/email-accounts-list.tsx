"use client";

import { useState } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import { Add } from "@mui/icons-material";
import { EmailAccountCard } from "./email-account-card";
import { EmailAccountForm } from "./email-account-form";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface EmailAccount {
    id: string;
    email: string;
    label: string | null;
    isMain: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface EmailAccountsListProps {
    accounts: EmailAccount[];
}

export function EmailAccountsList({ accounts }: EmailAccountsListProps) {
    const [formOpen, setFormOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<EmailAccount | null>(
        null
    );

    const handleEdit = (id: string) => {
        const account = accounts.find((a) => a.id === id);
        if (account) {
            setEditingAccount(account);
        }
    };

    const handleCloseForm = () => {
        setFormOpen(false);
        setEditingAccount(null);
    };

    return (
        <Box>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
                <ButtonBase
                    onClick={() => setFormOpen(true)}
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
                    Přidat emailový účet
                </ButtonBase>
            </Box>

            {accounts.length === 0 ? (
                <Box
                    sx={{
                        backgroundColor: p.surface,
                        border: `1px solid ${p.line}`,
                        borderRadius: "14px",
                        p: 2.5,
                    }}
                >
                    <Typography
                        sx={{
                            textAlign: "center",
                            py: 3.5,
                            color: p.ink3,
                        }}
                    >
                        Zatím nejsou přidány žádné emailové účty.
                    </Typography>
                </Box>
            ) : (
                <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}
                >
                    {accounts.map((account) => (
                        <EmailAccountCard
                            key={account.id}
                            account={account}
                            onEdit={handleEdit}
                        />
                    ))}
                </Box>
            )}

            {/* Create dialog */}
            <EmailAccountForm
                mode="create"
                open={formOpen}
                onClose={handleCloseForm}
            />

            {/* Edit dialog */}
            {editingAccount && (
                <EmailAccountForm
                    mode="edit"
                    open={true}
                    onClose={handleCloseForm}
                    account={editingAccount}
                />
            )}
        </Box>
    );
}
