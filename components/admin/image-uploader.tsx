"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import {
    Box,
    Typography,
    CircularProgress,
    IconButton,
    Alert,
} from "@mui/material";
import { CloudUpload, Delete, Image as ImageIcon } from "@mui/icons-material";
import { storageUrl } from "@/lib/utils/storage";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface ImageUploaderProps {
    value?: string;
    onChange: (url: string) => void;
    onError?: (error: string) => void;
    maxSizeMB?: number;
    acceptedTypes?: string[];
    disabled?: boolean;
}

const DEFAULT_MAX_SIZE_MB = 15;
const DEFAULT_ACCEPTED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
];

export function ImageUploader({
    value,
    onChange,
    onError,
    maxSizeMB = DEFAULT_MAX_SIZE_MB,
    acceptedTypes = DEFAULT_ACCEPTED_TYPES,
    disabled: externalDisabled = false,
}: ImageUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const handleError = useCallback(
        (message: string) => {
            setError(message);
            onError?.(message);
        },
        [onError]
    );

    const onDrop = useCallback(
        async (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
            setError(null);

            // Handle rejected files
            if (rejectedFiles.length > 0) {
                const rejection = rejectedFiles[0];
                const errorMessage =
                    rejection.errors[0]?.message || "Soubor nelze nahrat";
                handleError(errorMessage);
                return;
            }

            if (acceptedFiles.length === 0) return;

            const file = acceptedFiles[0];

            // Validate file size
            const maxSizeBytes = maxSizeMB * 1024 * 1024;
            if (file.size > maxSizeBytes) {
                handleError(
                    `Soubor je prilis velky. Maximum je ${maxSizeMB} MB.`
                );
                return;
            }

            // Create preview
            const objectUrl = URL.createObjectURL(file);
            setPreview(objectUrl);

            // Upload file
            setUploading(true);
            try {
                const formData = new FormData();
                formData.append("file", file);

                const response = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                });

                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.error || "Nahravani selhalo");
                }

                const data = await response.json();

                if (data.url) {
                    // Clear preview and revoke blob URL before setting new value
                    if (preview) {
                        URL.revokeObjectURL(preview);
                    }
                    setPreview(null);
                    onChange(data.url);
                    setError(null);
                } else {
                    throw new Error("Server nevratil URL obrazku");
                }
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Nahravani selhalo";
                handleError(message);
                setPreview(null);
            } finally {
                setUploading(false);
            }
        },
        [maxSizeMB, onChange, handleError, preview]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: acceptedTypes.reduce(
            (acc, type) => ({ ...acc, [type]: [] }),
            {} as Record<string, string[]>
        ),
        maxFiles: 1,
        disabled: uploading || externalDisabled,
    });

    // Cleanup blob URL on unmount or when preview changes
    useEffect(() => {
        return () => {
            if (preview) {
                URL.revokeObjectURL(preview);
            }
        };
    }, [preview]);

    const handleRemove = () => {
        onChange("");
        setPreview(null);
        setError(null);
    };

    const displayUrl = storageUrl(value) || preview;

    return (
        <Box>
            {error && (
                <Alert
                    severity="error"
                    sx={{ mb: 2 }}
                    onClose={() => setError(null)}
                >
                    {error}
                </Alert>
            )}

            <Box
                {...getRootProps()}
                sx={{
                    border: "2px dashed",
                    borderColor: isDragActive
                        ? p.indigo
                        : error
                          ? p.negInk
                          : p.line,
                    borderRadius: "12px",
                    p: 3,
                    textAlign: "center",
                    cursor:
                        uploading || externalDisabled ? "default" : "pointer",
                    bgcolor: isDragActive ? p.indigoSoft : p.surface,
                    transition: "all 140ms ease",
                    "&:hover": {
                        borderColor:
                            uploading || externalDisabled ? p.line : p.indigo,
                        bgcolor:
                            uploading || externalDisabled
                                ? p.surface
                                : p.indigoSoft,
                    },
                    position: "relative",
                    minHeight: 200,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <input {...getInputProps()} />

                {uploading ? (
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 2,
                        }}
                    >
                        <CircularProgress size={40} sx={{ color: p.indigo }} />
                        <Typography sx={{ color: p.ink2 }}>
                            Nahravam...
                        </Typography>
                    </Box>
                ) : displayUrl ? (
                    <Box sx={{ position: "relative", width: "100%" }}>
                        <Box
                            key={displayUrl}
                            component="img"
                            src={displayUrl}
                            alt="Nahled"
                            onError={() => {
                                // If image fails to load, clear it
                                if (preview) {
                                    URL.revokeObjectURL(preview);
                                    setPreview(null);
                                }
                                handleError("Obrazek se nepodarilo nacist");
                            }}
                            sx={{
                                maxHeight: 250,
                                maxWidth: "100%",
                                objectFit: "contain",
                                borderRadius: "10px",
                                border: `1px solid ${p.line}`,
                            }}
                        />
                        {!externalDisabled && (
                            <IconButton
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemove();
                                }}
                                sx={{
                                    position: "absolute",
                                    top: -12,
                                    right: -12,
                                    bgcolor: p.neg,
                                    color: p.negInk,
                                    "&:hover": {
                                        bgcolor: "#fecaca",
                                    },
                                }}
                                size="small"
                            >
                                <Delete fontSize="small" />
                            </IconButton>
                        )}
                    </Box>
                ) : (
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 1,
                        }}
                    >
                        {isDragActive ? (
                            <>
                                <CloudUpload
                                    sx={{ fontSize: 48, color: p.indigo }}
                                />
                                <Typography sx={{ color: p.indigo }}>
                                    Pustit pro nahrani
                                </Typography>
                            </>
                        ) : (
                            <>
                                <ImageIcon
                                    sx={{ fontSize: 48, color: p.ink3 }}
                                />
                                <Typography sx={{ color: p.ink2 }}>
                                    Pretahnete obrazek nebo kliknete pro vyber
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{ color: p.ink3 }}
                                >
                                    Podporovane formaty: JPG, PNG, WebP, GIF
                                    (max {maxSizeMB} MB)
                                </Typography>
                            </>
                        )}
                    </Box>
                )}
            </Box>

            {value && (
                <Typography
                    variant="caption"
                    sx={{
                        mt: 1,
                        display: "block",
                        wordBreak: "break-all",
                        color: p.ink3,
                    }}
                >
                    {value}
                </Typography>
            )}
        </Box>
    );
}
