"use client";

import {
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Popover,
} from "@mui/material";
import type { ContentBlockType } from "@/lib/types/content-blocks";
import { BLOCK_TYPES } from "./block-meta";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface BlockTypeSelectorProps {
    anchorEl: HTMLElement | null;
    onClose: () => void;
    onSelect: (type: ContentBlockType) => void;
    excludeTypes?: ContentBlockType[];
}

export function BlockTypeSelector({
    anchorEl,
    onClose,
    onSelect,
    excludeTypes,
}: BlockTypeSelectorProps) {
    const types = excludeTypes
        ? BLOCK_TYPES.filter((t) => !excludeTypes.includes(t.type))
        : BLOCK_TYPES;

    return (
        <Popover
            open={!!anchorEl}
            anchorEl={anchorEl}
            onClose={onClose}
            anchorOrigin={{
                vertical: "bottom",
                horizontal: "center",
            }}
            transformOrigin={{
                vertical: "top",
                horizontal: "center",
            }}
            PaperProps={{
                sx: {
                    borderRadius: "10px",
                    border: `1px solid ${p.line}`,
                    boxShadow: "0 12px 30px rgba(15,23,42,0.12)",
                    mt: 0.5,
                },
            }}
        >
            <List dense sx={{ minWidth: 180, py: 0.5 }}>
                {types.map(({ type, label, icon }) => (
                    <ListItemButton
                        key={type}
                        onClick={() => {
                            onSelect(type);
                            onClose();
                        }}
                        sx={{
                            mx: 0.5,
                            borderRadius: "8px",
                            color: p.ink,
                            transition: "all 140ms ease",
                            "&:hover": {
                                backgroundColor: p.indigoSoft,
                                color: p.indigoInk,
                            },
                        }}
                    >
                        <ListItemIcon sx={{ minWidth: 36, color: p.ink3 }}>
                            {icon}
                        </ListItemIcon>
                        <ListItemText primary={label} />
                    </ListItemButton>
                ))}
            </List>
        </Popover>
    );
}
