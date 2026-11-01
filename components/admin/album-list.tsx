import { Box, Typography, Tooltip } from "@mui/material";
import { Edit, PhotoLibrary, OpenInNew } from "@mui/icons-material";
import { IconLinkButton } from "@/components/ui/link-button";
import { AlbumActions } from "@/components/admin/album-actions";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { storageUrl } from "@/lib/utils/storage";

interface Album {
    id: string;
    slug: string;
    title: string;
    coverImage?: string | null;
    ogImageUrl?: string | null;
    isPublished?: boolean;
    externalUrl?: string;
    year: {
        year: number;
        title: string;
    };
}

interface AlbumListProps {
    albums: Album[];
    editBasePath?: string;
    showYear?: boolean;
}

export function AlbumList({
    albums,
    editBasePath = "/admin/galerie",
    showYear = true,
}: AlbumListProps) {
    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 2.25,
            }}
        >
            {albums.map((album) => {
                const thumbUrl =
                    storageUrl(album.coverImage) || album.ogImageUrl || "";
                return (
                    <Box
                        key={album.id}
                        sx={{
                            backgroundColor: p.surface,
                            border: `1px solid ${p.line}`,
                            borderRadius: "14px",
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column",
                            transition:
                                "box-shadow 160ms ease, transform 160ms ease",
                            "&:hover": {
                                boxShadow: "0 10px 28px rgba(15,23,42,0.1)",
                                transform: "translateY(-2px)",
                            },
                        }}
                    >
                        {/* thumbnail */}
                        <Box
                            sx={{
                                position: "relative",
                                height: 150,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                ...(thumbUrl
                                    ? {
                                          backgroundImage: `url(${thumbUrl})`,
                                          backgroundSize: "cover",
                                          backgroundPosition: "center",
                                      }
                                    : {
                                          background: `linear-gradient(135deg, ${p.indigoSoft}, ${p.field})`,
                                          color: p.fieldInk,
                                      }),
                            }}
                        >
                            {!thumbUrl && (
                                <PhotoLibrary
                                    sx={{ fontSize: 36, opacity: 0.7 }}
                                />
                            )}
                            {/* status badge */}
                            <Box
                                sx={{
                                    position: "absolute",
                                    top: 8,
                                    right: 8,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    px: "9px",
                                    py: "3px",
                                    borderRadius: "20px",
                                    backgroundColor: album.isPublished
                                        ? p.value
                                        : p.surface3,
                                    color: album.isPublished
                                        ? p.valueInk
                                        : p.ink2,
                                }}
                            >
                                <Box
                                    component="span"
                                    sx={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: "50%",
                                        backgroundColor: album.isPublished
                                            ? p.valueInk
                                            : p.ink3,
                                    }}
                                />
                                {album.isPublished ? "Publikováno" : "Skryté"}
                            </Box>
                        </Box>

                        {/* body */}
                        <Box
                            sx={{
                                p: 1.75,
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 1,
                                flex: 1,
                            }}
                        >
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                    sx={{
                                        fontWeight: 600,
                                        fontSize: "0.95rem",
                                        color: p.ink,
                                        lineHeight: 1.3,
                                    }}
                                    noWrap
                                >
                                    {album.title}
                                </Typography>
                                <Typography
                                    sx={{
                                        fontFamily:
                                            "'JetBrains Mono', monospace",
                                        fontSize: 11,
                                        color: p.ink3,
                                        mt: 0.4,
                                    }}
                                    noWrap
                                >
                                    /{album.slug}
                                </Typography>
                                {showYear && (
                                    <Typography
                                        sx={{
                                            fontSize: 12,
                                            color: p.ink2,
                                            mt: 0.5,
                                        }}
                                        noWrap
                                    >
                                        {album.year.year} – {album.year.title}
                                    </Typography>
                                )}
                            </Box>
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.25,
                                    flexShrink: 0,
                                }}
                            >
                                {album.externalUrl && (
                                    <Tooltip title="Otevřít galerii">
                                        <IconLinkButton
                                            href={album.externalUrl}
                                            size="small"
                                            sx={{
                                                color: p.ink3,
                                                "&:hover": { color: p.indigo },
                                            }}
                                        >
                                            <OpenInNew sx={{ fontSize: 16 }} />
                                        </IconLinkButton>
                                    </Tooltip>
                                )}
                                <Tooltip title="Upravit album">
                                    <IconLinkButton
                                        href={`${editBasePath}/${album.id}`}
                                        size="small"
                                        sx={{
                                            color: p.ink3,
                                            "&:hover": { color: p.indigo },
                                        }}
                                    >
                                        <Edit sx={{ fontSize: 16 }} />
                                    </IconLinkButton>
                                </Tooltip>
                                <AlbumActions albumId={album.id} />
                            </Box>
                        </Box>
                    </Box>
                );
            })}
        </Box>
    );
}
