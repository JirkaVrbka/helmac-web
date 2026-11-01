"use client";

import { useState, useTransition } from "react";
import { Box, Button, Alert } from "@mui/material";
import { Save, Edit, Close } from "@mui/icons-material";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { updateGdprContent } from "@/lib/actions/site-settings";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface GdprEditorProps {
    initialContent: string;
}

const ghostButtonSx = {
    backgroundColor: p.surface,
    border: `1px solid ${p.line}`,
    color: p.ink2,
    borderRadius: "10px",
    boxShadow: "none",
    "&:hover": {
        borderColor: p.indigo,
        backgroundColor: p.indigoSoft,
        color: p.indigo,
        boxShadow: "none",
    },
};

const primaryButtonSx = {
    backgroundColor: p.indigo,
    color: "#fff",
    borderRadius: "10px",
    boxShadow: "none",
    "&:hover": { backgroundColor: "#4338ca", boxShadow: "none" },
};

export function GdprEditor({ initialContent }: GdprEditorProps) {
    const [content, setContent] = useState(initialContent);
    const [isEditing, setIsEditing] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [feedback, setFeedback] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);

    const handleSave = () => {
        startTransition(async () => {
            const result = await updateGdprContent(content);
            if (result.error) {
                setFeedback({ type: "error", message: result.error });
            } else {
                setFeedback({
                    type: "success",
                    message: "GDPR obsah byl uložen",
                });
                setIsEditing(false);
            }
        });
    };

    const handleCancel = () => {
        setContent(initialContent);
        setIsEditing(false);
    };

    return (
        <Box
            sx={
                isEditing
                    ? {
                          height: "calc(100dvh - 180px)",
                          display: "flex",
                          flexDirection: "column",
                      }
                    : undefined
            }
        >
            {feedback && (
                <Alert
                    severity={feedback.type}
                    onClose={() => setFeedback(null)}
                    sx={{ mb: 2, flexShrink: 0, borderRadius: "12px" }}
                >
                    {feedback.message}
                </Alert>
            )}

            <Box
                sx={
                    isEditing
                        ? {
                              flex: 1,
                              minHeight: 200,
                              display: "flex",
                              flexDirection: "column",
                          }
                        : undefined
                }
            >
                <RichTextEditor
                    value={content}
                    onChange={setContent}
                    placeholder="Zadejte obsah GDPR / ochrana osobních údajů..."
                    minHeight={200}
                    editable={isEditing}
                />
            </Box>

            <Box
                sx={{
                    mt: 2,
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 1,
                    flexShrink: 0,
                }}
            >
                {isEditing ? (
                    <>
                        <Button
                            variant="outlined"
                            startIcon={<Close />}
                            onClick={handleCancel}
                            disabled={isPending}
                            sx={ghostButtonSx}
                        >
                            Zrušit
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<Save />}
                            onClick={handleSave}
                            disabled={isPending}
                            sx={primaryButtonSx}
                        >
                            {isPending ? "Ukládání..." : "Uložit"}
                        </Button>
                    </>
                ) : (
                    <Button
                        variant="contained"
                        startIcon={<Edit />}
                        onClick={() => setIsEditing(true)}
                        sx={primaryButtonSx}
                    >
                        Upravit
                    </Button>
                )}
            </Box>
        </Box>
    );
}
