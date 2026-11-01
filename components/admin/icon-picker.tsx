"use client";

import { useState, useMemo } from "react";
import {
    Box,
    Button,
    Checkbox,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    ListItemText,
    Menu,
    MenuItem,
    TextField,
    Typography,
    InputAdornment,
} from "@mui/material";
import { Add, Close, FilterList, Search } from "@mui/icons-material";
import { GameIcon, GAME_ICONS, ICON_TAGS } from "@/lib/icons";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import { builderFieldSx } from "@/components/admin/builder-field-sx";

const BATCH_SIZE = 60;

interface IconPickerProps {
    value: string | null;
    onChange: (icon: string | null) => void;
    renderTrigger?: (
        onClick: () => void,
        currentValue: string | null
    ) => React.ReactNode;
}

export function IconPicker({
    value,
    onChange,
    renderTrigger,
}: IconPickerProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
    const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);

    const filtered = useMemo(() => {
        return GAME_ICONS.filter((icon) => {
            if (tags.length > 0 && !tags.some((t) => icon.tags.includes(t)))
                return false;
            if (search) {
                const q = search.toLowerCase();
                return (
                    icon.label.toLowerCase().includes(q) ||
                    icon.name.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [search, tags]);

    const toggleTag = (t: string) => {
        setTags((prev) =>
            prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
        );
    };

    const visible = filtered.slice(0, visibleCount);
    const hasMore = visibleCount < filtered.length;

    const handleSelect = (name: string) => {
        onChange(name);
        setOpen(false);
    };

    const handleClear = () => {
        onChange(null);
        setOpen(false);
    };

    return (
        <>
            {renderTrigger ? (
                renderTrigger(() => setOpen(true), value)
            ) : (
                <>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setOpen(true)}
                        sx={{
                            width: 80,
                            minWidth: 80,
                            height: 80,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: value
                                ? `1px solid ${p.indigo}`
                                : `1px dashed ${p.line}`,
                            borderRadius: "10px",
                            cursor: "pointer",
                            backgroundColor: value ? p.indigoSoft : p.surface,
                            transition: "all 140ms ease",
                            "&:hover": {
                                borderColor: p.indigo,
                                backgroundColor: p.indigoSoft,
                            },
                        }}
                    >
                        {value ? (
                            <GameIcon
                                name={value}
                                sx={{ fontSize: 36, color: p.indigoInk }}
                            />
                        ) : (
                            <Add sx={{ fontSize: 24, color: p.ink3 }} />
                        )}
                    </Button>
                    <input type="hidden" name="icon" value={value || ""} />
                </>
            )}

            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: "14px" } }}
            >
                <DialogTitle
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontWeight: 700,
                    }}
                >
                    Vybrat ikonu
                    <IconButton
                        onClick={() => setOpen(false)}
                        size="small"
                        sx={{
                            color: p.ink3,
                            borderRadius: "8px",
                            "&:hover": {
                                color: p.indigo,
                                backgroundColor: p.indigoSoft,
                            },
                        }}
                    >
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Box
                        sx={{
                            display: "flex",
                            gap: 1,
                            mb: tags.length > 0 ? 1 : 2,
                        }}
                    >
                        <TextField
                            autoFocus
                            fullWidth
                            size="small"
                            placeholder="Hledat..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            sx={builderFieldSx}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search sx={{ color: p.ink3 }} />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <IconButton
                            onClick={(e) => setFilterAnchor(e.currentTarget)}
                            sx={{
                                color: tags.length > 0 ? p.indigo : p.ink3,
                                borderRadius: "8px",
                                "&:hover": {
                                    color: p.indigo,
                                    backgroundColor: p.indigoSoft,
                                },
                            }}
                        >
                            <FilterList />
                        </IconButton>
                        <Menu
                            anchorEl={filterAnchor}
                            open={Boolean(filterAnchor)}
                            onClose={() => setFilterAnchor(null)}
                            slotProps={{
                                paper: {
                                    sx: { maxHeight: 400 },
                                },
                            }}
                        >
                            {ICON_TAGS.map((t) => (
                                <MenuItem
                                    key={t}
                                    dense
                                    onClick={() => toggleTag(t)}
                                >
                                    <Checkbox
                                        size="small"
                                        checked={tags.includes(t)}
                                        sx={{ p: 0, mr: 1 }}
                                    />
                                    <ListItemText primary={t} />
                                </MenuItem>
                            ))}
                        </Menu>
                    </Box>

                    {tags.length > 0 && (
                        <Box
                            sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 0.5,
                                mb: 2,
                            }}
                        >
                            {tags.map((t) => (
                                <Chip
                                    key={t}
                                    label={t}
                                    size="small"
                                    onDelete={() => toggleTag(t)}
                                    sx={{
                                        borderRadius: "6px",
                                        backgroundColor: p.indigoSoft,
                                        color: p.indigoInk,
                                        "& .MuiChip-deleteIcon": {
                                            color: p.indigoInk,
                                        },
                                    }}
                                />
                            ))}
                        </Box>
                    )}

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(auto-fill, minmax(80px, 1fr))",
                            gap: 1,
                            maxHeight: 400,
                            overflowY: "auto",
                        }}
                    >
                        {visible.map((icon) => (
                            <Box
                                key={icon.name}
                                onClick={() => handleSelect(icon.name)}
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 0.5,
                                    p: 1,
                                    borderRadius: "10px",
                                    cursor: "pointer",
                                    border: `1px solid ${
                                        value === icon.name ? p.indigo : p.line
                                    }`,
                                    backgroundColor:
                                        value === icon.name
                                            ? p.indigoSoft
                                            : p.surface,
                                    transition: "all 140ms ease",
                                    "&:hover": {
                                        borderColor: p.indigo,
                                        backgroundColor: p.indigoSoft,
                                    },
                                }}
                            >
                                <GameIcon
                                    name={icon.name}
                                    sx={{ fontSize: 32, color: p.ink2 }}
                                />
                                <Typography
                                    variant="caption"
                                    sx={{
                                        textAlign: "center",
                                        lineHeight: 1.2,
                                        fontSize: "0.65rem",
                                        color: p.ink2,
                                    }}
                                >
                                    {icon.label}
                                </Typography>
                            </Box>
                        ))}
                        {hasMore && (
                            <Box
                                sx={{
                                    gridColumn: "1 / -1",
                                    display: "flex",
                                    justifyContent: "center",
                                    py: 1,
                                }}
                            >
                                <Button
                                    size="small"
                                    onClick={() =>
                                        setVisibleCount(
                                            (prev) => prev + BATCH_SIZE
                                        )
                                    }
                                    sx={{ color: p.indigo }}
                                >
                                    Načíst další{" "}
                                    {Math.min(
                                        BATCH_SIZE,
                                        filtered.length - visibleCount
                                    )}{" "}
                                    z {filtered.length - visibleCount}
                                </Button>
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 2 }}>
                    {value && (
                        <Button
                            onClick={handleClear}
                            size="small"
                            disableElevation
                            sx={{
                                borderRadius: "10px",
                                backgroundColor: p.neg,
                                color: p.negInk,
                                "&:hover": { backgroundColor: "#fecaca" },
                            }}
                        >
                            Odebrat ikonu
                        </Button>
                    )}
                    <Button
                        onClick={() => setOpen(false)}
                        size="small"
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
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
