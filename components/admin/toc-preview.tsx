"use client";

import { useMemo, type ReactNode } from "react";
import { Box, Collapse, Typography } from "@mui/material";
import { extractMarkdownToc } from "@/lib/utils/markdown-toc-helpers";
import { blocksToMarkdown } from "@/lib/types/content-blocks";
import type { ContentBlock } from "@/lib/types/content-blocks";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface TocPreviewProps {
    show: boolean;
    blocks?: ContentBlock[];
    content?: string;
    children: ReactNode;
}

export function TocPreview({
    show,
    blocks,
    content,
    children,
}: TocPreviewProps) {
    const markdown = useMemo(
        () => (blocks ? blocksToMarkdown(blocks) : (content ?? "")),
        [blocks, content]
    );

    const items = useMemo(() => extractMarkdownToc(markdown), [markdown]);

    const hasToc = show && items.length > 0;

    return (
        <Box
            sx={{
                display: "flex",
                gap: 3,
                alignItems: "flex-start",
            }}
        >
            <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>

            <Collapse
                orientation="horizontal"
                in={hasToc}
                mountOnEnter
                unmountOnExit
            >
                <Box
                    sx={{
                        width: 200,
                        flexShrink: 0,
                        borderLeft: `1px solid ${p.line}`,
                        pl: 3,
                        position: "sticky",
                        top: 80,
                        maxHeight: "calc(100vh - 96px)",
                        overflowY: "auto",
                        scrollbarWidth: "none",
                        "&::-webkit-scrollbar": {
                            display: "none",
                        },
                    }}
                >
                    <Typography
                        sx={{
                            display: "block",
                            mb: 1.5,
                            fontSize: 11,
                            fontWeight: 700,
                            color: p.ink3,
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                        }}
                    >
                        Obsah
                    </Typography>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.5,
                        }}
                    >
                        {items.map((item) => (
                            <Typography
                                key={item.id}
                                variant="body2"
                                sx={{
                                    pl: item.level === 3 ? 2 : 0,
                                    py: 0.5,
                                    borderLeft: "2px solid transparent",
                                    paddingLeft: item.level === 3 ? 3 : 1,
                                    fontSize:
                                        item.level === 3
                                            ? "0.8125rem"
                                            : "0.875rem",
                                    lineHeight: 1.4,
                                    color: p.ink2,
                                }}
                            >
                                {item.text}
                            </Typography>
                        ))}
                    </Box>
                </Box>
            </Collapse>
        </Box>
    );
}
