"use client";

import { Box, Tooltip, Typography } from "@mui/material";
import { Edit } from "@mui/icons-material";
import { IconLinkButton } from "@/components/ui/link-button";
import { SortableList } from "@/components/admin/sortable-list";
import { PageActions } from "@/components/admin/page-actions";
import { reorderPages } from "@/lib/actions/pages";
import { useToast } from "@/lib/hooks/use-toast";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface Page {
    id: string;
    slug: string;
    title: string;
    isPublished: boolean;
}

interface SortablePagesProps {
    yearId: string;
    pages: Page[];
}

export function SortablePages({ yearId, pages }: SortablePagesProps) {
    const toast = useToast();

    const handleReorder = async (newOrder: string[]) => {
        const result = await reorderPages(yearId, newOrder);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Pořadí stránek bylo změněno");
        }
    };

    return (
        <SortableList
            items={pages}
            getId={(page) => page.id}
            onReorder={handleReorder}
            renderItem={(page) => (
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        flex: 1,
                        py: 0.75,
                        pr: 1,
                    }}
                >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                            }}
                        >
                            <Typography
                                sx={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: p.ink,
                                }}
                                noWrap
                            >
                                {page.title}
                            </Typography>
                            <Box
                                component="span"
                                sx={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    px: "10px",
                                    py: "3px",
                                    borderRadius: "20px",
                                    whiteSpace: "nowrap",
                                    flexShrink: 0,
                                    backgroundColor: page.isPublished
                                        ? p.value
                                        : p.surface3,
                                    color: page.isPublished
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
                                        backgroundColor: page.isPublished
                                            ? p.valueInk
                                            : p.ink3,
                                    }}
                                />
                                {page.isPublished ? "Publikováno" : "Skryto"}
                            </Box>
                        </Box>
                        <Typography
                            sx={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: 12,
                                color: p.ink3,
                            }}
                            noWrap
                        >
                            /{page.slug}
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.25,
                            flexShrink: 0,
                        }}
                    >
                        <Tooltip title="Upravit stránku">
                            <IconLinkButton
                                href={`/admin/rocniky/${yearId}/stranky/${page.id}`}
                                size="small"
                                sx={{
                                    color: p.ink3,
                                    "&:hover": {
                                        color: p.indigo,
                                    },
                                }}
                            >
                                <Edit sx={{ fontSize: 16 }} />
                            </IconLinkButton>
                        </Tooltip>
                        <PageActions
                            pageId={page.id}
                            isPublished={page.isPublished}
                        />
                    </Box>
                </Box>
            )}
        />
    );
}
