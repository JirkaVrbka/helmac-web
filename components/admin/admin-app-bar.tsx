"use client";

import {
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Box,
    Breadcrumbs as MuiBreadcrumbs,
    Link as MuiLink,
} from "@mui/material";
import { Menu as MenuIcon, Home, NavigateNext } from "@mui/icons-material";
import { useSidebarContext } from "@/lib/contexts/sidebar-context";
import { builderPalette as p } from "@/components/admin/email-builder/palette";
import Link from "next/link";

interface AdminAppBarProps {
    drawerWidth: number;
    onMenuClick: () => void;
}

export function AdminAppBar({ drawerWidth, onMenuClick }: AdminAppBarProps) {
    const { pageHeader } = useSidebarContext();

    return (
        <AppBar
            position="fixed"
            sx={{
                width: { md: `calc(100% - ${drawerWidth}px)` },
                ml: { md: `${drawerWidth}px` },
                backgroundColor: p.surface,
                backgroundImage: "none",
                color: p.ink,
                boxShadow: "none",
                borderBottom: `1px solid ${p.line}`,
            }}
        >
            <Toolbar>
                <IconButton
                    aria-label="open drawer"
                    edge="start"
                    onClick={onMenuClick}
                    sx={{ mr: 2, display: { md: "none" }, color: p.ink2 }}
                >
                    <MenuIcon />
                </IconButton>
                {pageHeader ? (
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexGrow: 1,
                            minWidth: 0,
                        }}
                    >
                        <MuiBreadcrumbs
                            separator={
                                <NavigateNext
                                    fontSize="small"
                                    sx={{ color: p.ink3 }}
                                />
                            }
                            sx={{
                                color: "inherit",
                                minWidth: 0,
                                "& .MuiBreadcrumbs-ol": {
                                    flexWrap: "nowrap",
                                },
                            }}
                        >
                            <MuiLink
                                component={Link}
                                href="/admin"
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    color: p.ink2,
                                    textDecoration: "none",
                                    "&:hover": {
                                        color: p.indigo,
                                        textDecoration: "underline",
                                    },
                                }}
                            >
                                <Home sx={{ mr: 0.5, fontSize: 20 }} />
                                Dashboard
                            </MuiLink>
                            {pageHeader.breadcrumbs.map((item, index) =>
                                item.href ? (
                                    <MuiLink
                                        key={index}
                                        component={Link}
                                        href={item.href}
                                        sx={{
                                            color: p.ink2,
                                            textDecoration: "none",
                                            whiteSpace: "nowrap",
                                            "&:hover": {
                                                color: p.indigo,
                                                textDecoration: "underline",
                                            },
                                        }}
                                    >
                                        {item.label}
                                    </MuiLink>
                                ) : (
                                    <Typography
                                        key={index}
                                        sx={{
                                            color: p.ink,
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {item.label}
                                    </Typography>
                                )
                            )}
                        </MuiBreadcrumbs>
                        <Typography
                            variant="h6"
                            noWrap
                            sx={{
                                ml: 2,
                                flexShrink: 0,
                                color: p.ink,
                            }}
                        >
                            {pageHeader.title}
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography
                            variant="h6"
                            noWrap
                            component="div"
                            sx={{ color: p.ink }}
                        >
                            Administrace
                        </Typography>
                    </Box>
                )}
            </Toolbar>
        </AppBar>
    );
}
