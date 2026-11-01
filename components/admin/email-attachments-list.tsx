"use client";

import { useCallback, useState } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import {
    Alert,
    Box,
    CircularProgress,
    IconButton,
    Link,
    Tooltip,
    Typography,
} from "@mui/material";
import { CloudUpload, Delete, AttachFile } from "@mui/icons-material";
import {
    ATTACHMENT_ALLOWED_TYPES,
    MAX_ATTACHMENT_SIZE,
    MAX_ATTACHMENTS_TOTAL,
    type EmailAttachment,
} from "@/lib/validators/email-attachment";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface EmailAttachmentsListProps {
    value: EmailAttachment[];
    onChange: (next: EmailAttachment[]) => void;
    disabled?: boolean;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function EmailAttachmentsList({
    value,
    onChange,
    disabled = false,
}: EmailAttachmentsListProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const totalSize = value.reduce((sum, a) => sum + a.size, 0);
    const remaining = MAX_ATTACHMENTS_TOTAL - totalSize;

    const onDrop = useCallback(
        async (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
            setError(null);

            if (rejectedFiles.length > 0) {
                const rejection = rejectedFiles[0];
                setError(rejection.errors[0]?.message ?? "Soubor nelze nahrát");
                return;
            }

            if (acceptedFiles.length === 0) return;

            const incomingSize = acceptedFiles.reduce(
                (sum, f) => sum + f.size,
                0
            );
            if (totalSize + incomingSize > MAX_ATTACHMENTS_TOTAL) {
                setError(
                    `Celková velikost příloh by přesáhla ${formatBytes(MAX_ATTACHMENTS_TOTAL)}`
                );
                return;
            }

            setUploading(true);
            const uploaded: EmailAttachment[] = [];
            try {
                for (const file of acceptedFiles) {
                    if (file.size > MAX_ATTACHMENT_SIZE) {
                        throw new Error(
                            `Soubor "${file.name}" je větší než ${formatBytes(MAX_ATTACHMENT_SIZE)}`
                        );
                    }
                    const formData = new FormData();
                    formData.append("file", file);

                    const response = await fetch("/api/upload-attachment", {
                        method: "POST",
                        body: formData,
                    });

                    if (!response.ok) {
                        const data = await response.json().catch(() => ({}));
                        throw new Error(data.error || "Nahrávání selhalo");
                    }

                    const data = await response.json();
                    uploaded.push({
                        filename: data.filename,
                        url: data.url,
                        contentType: data.contentType,
                        size: data.size,
                    });
                }
                onChange([...value, ...uploaded]);
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : "Nahrávání selhalo"
                );
            } finally {
                setUploading(false);
            }
        },
        [onChange, totalSize, value]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: ATTACHMENT_ALLOWED_TYPES.reduce(
            (acc, type) => ({ ...acc, [type]: [] }),
            {} as Record<string, string[]>
        ),
        disabled: uploading || disabled || remaining <= 0,
    });

    const handleRemove = (url: string) => {
        onChange(value.filter((a) => a.url !== url));
    };

    const dropDisabled = uploading || disabled || remaining <= 0;

    return (
        <Box>
            <Typography
                sx={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: p.ink2,
                    mb: 1,
                }}
            >
                Přílohy
            </Typography>

            {error && (
                <Alert
                    severity="error"
                    sx={{ mb: 2 }}
                    onClose={() => setError(null)}
                >
                    {error}
                </Alert>
            )}

            {value.length > 0 && (
                <Box
                    sx={{
                        mb: 1.5,
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                    }}
                >
                    {value.map((a) => (
                        <Box
                            key={a.url}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.25,
                                px: 1.5,
                                py: 1,
                                border: `1px solid ${p.line}`,
                                borderRadius: "10px",
                                backgroundColor: p.surface,
                            }}
                        >
                            <AttachFile
                                sx={{
                                    fontSize: 18,
                                    color: p.ink3,
                                    flexShrink: 0,
                                }}
                            />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Link
                                    href={a.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    underline="hover"
                                    sx={{
                                        color: p.indigo,
                                        fontSize: 14,
                                        fontWeight: 500,
                                    }}
                                >
                                    {a.filename}
                                </Link>
                                <Typography
                                    sx={{ fontSize: 12, color: p.ink3 }}
                                >
                                    {formatBytes(a.size)}
                                </Typography>
                            </Box>
                            {!disabled && (
                                <Tooltip title="Odebrat přílohu">
                                    <IconButton
                                        size="small"
                                        onClick={() => handleRemove(a.url)}
                                        aria-label="Odebrat přílohu"
                                        sx={{
                                            color: p.ink3,
                                            borderRadius: "8px",
                                            transition: "all 140ms ease",
                                            "&:hover": {
                                                color: p.negInk,
                                                backgroundColor: p.neg,
                                            },
                                        }}
                                    >
                                        <Delete fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Box>
                    ))}
                </Box>
            )}

            <Box
                {...getRootProps()}
                sx={{
                    border: `2px dashed ${isDragActive ? p.indigo : p.line}`,
                    borderRadius: "10px",
                    p: 2,
                    textAlign: "center",
                    cursor: dropDisabled ? "default" : "pointer",
                    backgroundColor: isDragActive
                        ? p.indigoSoft
                        : "transparent",
                    transition: "all 140ms ease",
                    "&:hover": {
                        borderColor: dropDisabled ? p.line : p.indigo,
                    },
                }}
            >
                <input {...getInputProps()} />
                {uploading ? (
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 1,
                        }}
                    >
                        <CircularProgress size={24} />
                        <Typography variant="body2" sx={{ color: p.ink2 }}>
                            Nahrávám…
                        </Typography>
                    </Box>
                ) : (
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 0.5,
                        }}
                    >
                        <CloudUpload sx={{ fontSize: 32, color: p.ink3 }} />
                        <Typography variant="body2" sx={{ color: p.ink2 }}>
                            {remaining <= 0
                                ? "Dosažen limit 25 MB"
                                : "Přetáhněte soubory nebo klikněte pro výběr"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: p.ink3 }}>
                            PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, ZIP, obrázky ·
                            max {formatBytes(MAX_ATTACHMENT_SIZE)} / soubor ·{" "}
                            {formatBytes(totalSize)} /{" "}
                            {formatBytes(MAX_ATTACHMENTS_TOTAL)}
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
}
