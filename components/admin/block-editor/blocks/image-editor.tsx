"use client";

import { Box, TextField } from "@mui/material";
import { ImageUploader } from "@/components/admin/image-uploader";
import type { ImageBlock } from "@/lib/types/content-blocks";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

interface ImageBlockEditorProps {
    block: ImageBlock;
    onChange: (block: ImageBlock) => void;
}

export function ImageBlockEditor({ block, onChange }: ImageBlockEditorProps) {
    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                p: 1,
                height: "100%",
                overflow: "hidden",
            }}
        >
            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflow: "hidden",
                    "& > div > div": {
                        minHeight: "unset !important",
                        height: "100%",
                        p: 1,
                    },
                    "& img": {
                        maxHeight: "100%",
                        objectFit: "contain",
                    },
                }}
            >
                <ImageUploader
                    value={block.url}
                    onChange={(url) => onChange({ ...block, url })}
                />
            </Box>
            <Box
                sx={{
                    display: "flex",
                    gap: 1,
                    flexShrink: 0,
                }}
            >
                <TextField
                    size="small"
                    label="Alt text"
                    value={block.alt}
                    onChange={(e) =>
                        onChange({ ...block, alt: e.target.value })
                    }
                    sx={{ flex: 1, ...builderFieldSx }}
                />
                <TextField
                    size="small"
                    label="Popisek"
                    value={block.caption}
                    onChange={(e) =>
                        onChange({ ...block, caption: e.target.value })
                    }
                    sx={{ flex: 1, ...builderFieldSx }}
                />
            </Box>
        </Box>
    );
}
