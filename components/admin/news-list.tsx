import { Box, Typography, Tooltip } from "@mui/material";
import { Edit } from "@mui/icons-material";
import { IconLinkButton } from "@/components/ui/link-button";
import { NewsActions } from "@/components/admin/news-actions";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { formatDate } from "@/lib/utils/date";

interface News {
    id: string;
    slug: string;
    title: string;
    publishedAt: Date | null;
    year: {
        year: number;
        title: string;
    };
}

interface NewsListProps {
    news: News[];
    editBasePath?: string;
    showYear?: boolean;
}

export function NewsList({
    news,
    editBasePath = "/admin/novinky",
    showYear = true,
}: NewsListProps) {
    return (
        <Box
            sx={{
                backgroundColor: p.surface,
                border: `1px solid ${p.line}`,
                borderRadius: "14px",
                overflow: "hidden",
            }}
        >
            {/* pane head */}
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: 2.5,
                    py: 1.75,
                    borderBottom: `1px solid ${p.line}`,
                    background: `linear-gradient(180deg, ${p.surface}, ${p.surface2})`,
                }}
            >
                <Typography
                    sx={{
                        flex: 1,
                        fontSize: "0.85rem",
                        color: p.ink3,
                    }}
                >
                    Celkem {news.length} novinek
                </Typography>
            </Box>

            {news.map((item, index) => (
                <Box
                    key={item.id}
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        px: 2.5,
                        py: 2,
                        borderBottom:
                            index < news.length - 1
                                ? `1px solid ${p.lineSoft}`
                                : "none",
                    }}
                >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 600, color: p.ink }}>
                            {item.title}
                        </Typography>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                mt: 0.25,
                            }}
                        >
                            {showYear && (
                                <Typography
                                    sx={{ fontSize: "0.85rem", color: p.ink3 }}
                                >
                                    {item.year.year} - {item.year.title}
                                </Typography>
                            )}
                            {item.publishedAt && (
                                <>
                                    {showYear && (
                                        <Typography
                                            sx={{
                                                fontSize: "0.85rem",
                                                color: p.ink3,
                                                opacity: 0.6,
                                            }}
                                        >
                                            |
                                        </Typography>
                                    )}
                                    <Typography
                                        sx={{
                                            fontSize: "0.85rem",
                                            color: p.ink3,
                                        }}
                                    >
                                        {formatDate(item.publishedAt)}
                                    </Typography>
                                </>
                            )}
                        </Box>
                    </Box>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.25,
                            flexShrink: 0,
                        }}
                    >
                        <Tooltip title="Upravit novinku">
                            <IconLinkButton
                                href={`${editBasePath}/${item.id}`}
                                size="small"
                                sx={{
                                    color: p.ink3,
                                    borderRadius: "8px",
                                    "&:hover": { color: p.indigo },
                                }}
                            >
                                <Edit sx={{ fontSize: 16 }} />
                            </IconLinkButton>
                        </Tooltip>
                        <NewsActions newsId={item.id} />
                    </Box>
                </Box>
            ))}
        </Box>
    );
}
