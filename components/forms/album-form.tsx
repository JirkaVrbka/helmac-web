"use client";

import { useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
    Box,
    Button,
    TextField,
    Alert,
    CircularProgress,
    Card,
    CardContent,
    CardActions,
    MenuItem,
    Typography,
} from "@mui/material";
import { Edit, Save } from "@mui/icons-material";
import { LinkButton } from "@/components/ui/link-button";
import {
    createAlbum,
    updateAlbum,
    fetchAlbumOgImage,
    AlbumActionState,
} from "@/lib/actions/albums";
import { ImageUploader } from "@/components/admin/image-uploader";
import { storageUrl } from "@/lib/utils/storage";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

interface AlbumFormProps {
    mode: "create" | "edit";
    years: { id: string; year: number; title: string }[];
    albumId?: string;
    defaultValues?: {
        yearId?: string;
        title?: string;
        description?: string | null;
        coverImage?: string | null;
        ogImageUrl?: string | null;
        externalUrl?: string;
    };
    cancelHref?: string;
    redirectTo?: string;
    hideYearSelect?: boolean;
}

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
    const { pending } = useFormStatus();

    return (
        <Button
            type="submit"
            variant="contained"
            disabled={pending}
            disableElevation
            sx={{
                borderRadius: "10px",
                backgroundColor: p.indigo,
                "&:hover": { backgroundColor: "#4338ca" },
            }}
            startIcon={
                pending ? (
                    <CircularProgress size={20} color="inherit" />
                ) : (
                    <Save />
                )
            }
        >
            {pending
                ? "Ukládám..."
                : mode === "create"
                  ? "Vytvořit album"
                  : "Uložit změny"}
        </Button>
    );
}

export function AlbumForm({
    mode,
    years,
    albumId,
    defaultValues,
    cancelHref = "/admin/galerie",
    redirectTo,
    hideYearSelect,
}: AlbumFormProps) {
    const selectedYearId = defaultValues?.yearId || years[0]?.id || "";
    const [coverImage, setCoverImage] = useState(
        defaultValues?.coverImage || ""
    );
    const [ogImageUrl, setOgImageUrl] = useState(
        defaultValues?.ogImageUrl || ""
    );
    const [ogLoading, setOgLoading] = useState(false);
    const [editing, setEditing] = useState(mode === "create");

    const action =
        mode === "create"
            ? async (prevState: AlbumActionState, formData: FormData) => {
                  const yearId = formData.get("yearId") as string;
                  return createAlbum(yearId, prevState, formData);
              }
            : updateAlbum.bind(null, albumId as string);

    const [state, formAction] = useActionState<AlbumActionState, FormData>(
        action,
        null
    );

    return (
        <Card
            elevation={0}
            sx={{
                border: `1px solid ${p.line}`,
                borderRadius: "14px",
                backgroundColor: p.surface,
            }}
        >
            <Box component="form" action={formAction}>
                <CardContent
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 3,
                    }}
                >
                    {state?.error?._form && (
                        <Alert severity="error">{state.error._form[0]}</Alert>
                    )}

                    {state?.success && (
                        <Alert severity="success">Změny byly uloženy.</Alert>
                    )}

                    {redirectTo && (
                        <input
                            type="hidden"
                            name="redirectTo"
                            value={redirectTo}
                        />
                    )}

                    {mode === "create" && hideYearSelect && (
                        <input
                            type="hidden"
                            name="yearId"
                            value={selectedYearId}
                        />
                    )}

                    {mode === "create" && !hideYearSelect && (
                        <TextField
                            select
                            required
                            fullWidth
                            id="yearId"
                            name="yearId"
                            label="Ročník"
                            defaultValue={selectedYearId}
                            sx={builderFieldSx}
                        >
                            {years.map((year) => (
                                <MenuItem key={year.id} value={year.id}>
                                    {year.year} - {year.title}
                                </MenuItem>
                            ))}
                        </TextField>
                    )}

                    <TextField
                        required
                        fullWidth
                        id="title"
                        name="title"
                        label="Název alba"
                        defaultValue={defaultValues?.title || ""}
                        error={!!state?.error?.title}
                        helperText={state?.error?.title?.[0]}
                        disabled={!editing}
                        sx={builderFieldSx}
                    />

                    <TextField
                        fullWidth
                        id="description"
                        name="description"
                        label="Popis alba"
                        defaultValue={defaultValues?.description || ""}
                        error={!!state?.error?.description}
                        helperText={state?.error?.description?.[0]}
                        multiline
                        rows={3}
                        inputProps={{ maxLength: 1000 }}
                        disabled={!editing}
                        sx={builderFieldSx}
                    />

                    <TextField
                        required
                        fullWidth
                        id="externalUrl"
                        name="externalUrl"
                        label="Externí odkaz (URL)"
                        placeholder="https://"
                        defaultValue={defaultValues?.externalUrl || ""}
                        error={!!state?.error?.externalUrl}
                        helperText={
                            state?.error?.externalUrl?.[0] ||
                            "Odkaz na externí galerii (např. Google Photos, Rajče apod.)"
                        }
                        disabled={!editing}
                        sx={builderFieldSx}
                        onBlur={async (e) => {
                            const url = e.target.value.trim();
                            if (!url || !editing) return;
                            try {
                                new URL(url);
                            } catch {
                                return;
                            }
                            setOgLoading(true);
                            const result = await fetchAlbumOgImage(url);
                            setOgImageUrl(result.ogImageUrl || "");
                            setOgLoading(false);
                        }}
                    />

                    {ogImageUrl && !coverImage && (
                        <Box>
                            <Typography
                                variant="subtitle2"
                                sx={{ mb: 1, color: p.ink2 }}
                            >
                                Náhled z odkazu
                            </Typography>
                            <Box
                                component="img"
                                src={ogImageUrl}
                                alt="Náhled z odkazu"
                                sx={{
                                    maxHeight: 250,
                                    maxWidth: "100%",
                                    objectFit: "contain",
                                    borderRadius: "10px",
                                    border: `1px solid ${p.line}`,
                                }}
                            />
                        </Box>
                    )}
                    {ogLoading && (
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                            }}
                        >
                            <CircularProgress
                                size={16}
                                sx={{ color: p.indigo }}
                            />
                            <Typography variant="body2" sx={{ color: p.ink2 }}>
                                Načítám náhled z odkazu...
                            </Typography>
                        </Box>
                    )}

                    <Box>
                        <Typography
                            variant="subtitle2"
                            sx={{ mb: 1, color: p.ink2 }}
                        >
                            Vlastní obrázek (volitelné)
                        </Typography>
                        {editing ? (
                            <ImageUploader
                                value={coverImage}
                                onChange={setCoverImage}
                            />
                        ) : coverImage ? (
                            <Box
                                component="img"
                                src={storageUrl(coverImage)}
                                alt="Titulní obrázek"
                                sx={{
                                    maxHeight: 250,
                                    maxWidth: "100%",
                                    objectFit: "contain",
                                    borderRadius: "10px",
                                    border: `1px solid ${p.line}`,
                                }}
                            />
                        ) : (
                            <Typography sx={{ color: p.ink2 }}>
                                {ogImageUrl
                                    ? "Použije se náhled z odkazu"
                                    : "Bez obrázku"}
                            </Typography>
                        )}
                        <input
                            type="hidden"
                            name="coverImage"
                            value={coverImage}
                        />
                        {state?.error?.coverImage && (
                            <Typography
                                variant="caption"
                                sx={{ mt: 0.5, color: p.negInk }}
                            >
                                {state.error.coverImage[0]}
                            </Typography>
                        )}
                    </Box>
                </CardContent>

                <CardActions sx={{ px: 2, pb: 2 }}>
                    {editing ? (
                        <>
                            <SubmitButton mode={mode} />
                            {mode === "edit" ? (
                                <Button
                                    onClick={() => setEditing(false)}
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
                                    Zrušit úpravy
                                </Button>
                            ) : (
                                <LinkButton
                                    href={cancelHref}
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
                                </LinkButton>
                            )}
                        </>
                    ) : (
                        <Button
                            variant="contained"
                            disableElevation
                            startIcon={<Edit />}
                            onClick={() => setEditing(true)}
                            sx={{
                                borderRadius: "10px",
                                backgroundColor: p.indigo,
                                "&:hover": { backgroundColor: "#4338ca" },
                            }}
                        >
                            Upravit
                        </Button>
                    )}
                </CardActions>
            </Box>
        </Card>
    );
}
