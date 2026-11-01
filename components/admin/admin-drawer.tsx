"use client";

import { usePathname } from "next/navigation";
import {
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Divider,
    Box,
    Typography,
    Avatar,
    Chip,
    IconButton,
    Tooltip,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { signOut } from "next-auth/react";
import { ListItemLinkButton } from "@/components/ui/link-button";
import {
    Dashboard,
    CalendarMonth,
    Today,
    Newspaper,
    PhotoLibrary,
    People,
    PersonOutline,
    Logout,
    Settings,
    PrivacyTip,
    Email,
    AccountBalance,
} from "@mui/icons-material";
import { useSidebarContext } from "@/lib/contexts/sidebar-context";
import { YearSidebar } from "./year-sidebar";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface MenuItem {
    text: string;
    href: string;
    icon: React.ComponentType;
    roles?: string[];
    indented?: boolean;
}

interface MenuDivider {
    divider: true;
}

type MenuItemType = MenuItem | MenuDivider;

const staticMenuItems: MenuItemType[] = [
    { text: "Dashboard", href: "/admin", icon: Dashboard },
    { text: "Ročníky", href: "/admin/rocniky", icon: CalendarMonth },
    { text: "Novinky", href: "/admin/novinky", icon: Newspaper },
    { text: "Galerie", href: "/admin/galerie", icon: PhotoLibrary },
    {
        text: "Účastníci",
        href: "/admin/ucastnici",
        icon: PersonOutline,
        roles: ["SUPER_ADMIN", "ADMIN"],
    },
    { divider: true },
    {
        text: "Uživatelé",
        href: "/admin/uzivatele",
        icon: People,
        roles: ["SUPER_ADMIN"],
    },
    { divider: true },
    { text: "Nastavení", href: "/admin/nastaveni", icon: Settings },
    {
        text: "GDPR",
        href: "/admin/nastaveni/gdpr",
        icon: PrivacyTip,
        indented: true,
    },
    {
        text: "Emailové účty",
        href: "/admin/nastaveni/emaily",
        icon: Email,
        indented: true,
        roles: ["SUPER_ADMIN", "ADMIN"],
    },
    {
        text: "Banka",
        href: "/admin/nastaveni/banka",
        icon: AccountBalance,
        indented: true,
        roles: ["SUPER_ADMIN", "ADMIN"],
    },
];

const drawerItemSx = {
    position: "relative",
    mx: 1,
    my: "1px",
    py: "9px",
    pl: "12px",
    pr: "12px",
    borderRadius: "10px",
    color: p.ink2,
    transition: "all 140ms ease",
    "& .MuiListItemIcon-root": {
        minWidth: 36,
        color: p.ink3,
        transition: "color 140ms ease",
    },
    "& .MuiListItemText-primary": {
        fontSize: "0.9rem",
    },
    "&:hover": {
        backgroundColor: p.surface2,
        color: p.ink,
        "& .MuiListItemIcon-root": { color: p.ink2 },
    },
    "&.Mui-selected": {
        backgroundColor: p.indigoSoft,
        color: p.indigoInk,
        "& .MuiListItemText-primary": { fontWeight: 600 },
        "& .MuiListItemIcon-root": { color: p.indigo },
        "&:hover": {
            backgroundColor: p.indigoSoft,
            color: p.indigoInk,
            "& .MuiListItemIcon-root": { color: p.indigo },
        },
        "&::before": {
            content: '""',
            position: "absolute",
            left: 0,
            top: 7,
            bottom: 7,
            width: 3,
            borderRadius: "0 3px 3px 0",
            backgroundColor: p.indigo,
        },
    },
} as const;

const ROLE_LABELS: Record<string, string> = {
    SUPER_ADMIN: "Super Admin",
    ADMIN: "Admin",
    EDITOR: "Editor",
};

interface AdminDrawerProps {
    width: number;
    mobileOpen: boolean;
    onClose: () => void;
    userRole?: string;
    userName?: string;
    activeYearId?: string;
}

export function AdminDrawer({
    width,
    mobileOpen,
    onClose,
    userRole,
    userName,
    activeYearId,
}: AdminDrawerProps) {
    const pathname = usePathname();
    const { enqueueSnackbar } = useSnackbar();
    const { sidebarYear } = useSidebarContext();

    const activeYearHref = activeYearId
        ? `/admin/rocniky/${activeYearId}`
        : undefined;

    const filteredMenuItems = staticMenuItems.filter((item) => {
        if ("divider" in item) return true;
        if (!item.roles) return true;
        return userRole && item.roles.includes(userRole);
    });

    const handleActiveYearClick = () => {
        if (!activeYearId) {
            enqueueSnackbar("Žádný ročník není aktivní", { variant: "info" });
        }
        onClose();
    };

    const handleLogout = async () => {
        await signOut({ callbackUrl: "/admin/login" });
    };

    const activeYearIsActive = activeYearHref
        ? pathname.startsWith(activeYearHref)
        : false;

    const userSection = (
        <Box>
            <Divider sx={{ borderColor: p.line }} />
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: 2,
                    py: 1.5,
                }}
            >
                <Avatar
                    sx={{
                        width: 34,
                        height: 34,
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        borderRadius: "10px",
                        bgcolor: p.indigo,
                    }}
                >
                    {userName ? userName.charAt(0).toUpperCase() : "U"}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                        variant="body2"
                        fontWeight={600}
                        noWrap
                        sx={{ color: p.ink }}
                    >
                        {userName || "Uživatel"}
                    </Typography>
                    {userRole && (
                        <Chip
                            label={ROLE_LABELS[userRole] || userRole}
                            size="small"
                            variant="outlined"
                            sx={{
                                height: 18,
                                fontSize: "0.65rem",
                                mt: 0.25,
                                borderColor: p.line,
                                color: p.ink2,
                            }}
                        />
                    )}
                </Box>
                <Tooltip title="Odhlásit">
                    <IconButton
                        size="small"
                        onClick={handleLogout}
                        sx={{
                            borderRadius: "8px",
                            color: p.ink3,
                            transition: "all 140ms ease",
                            "&:hover": {
                                color: p.negInk,
                                backgroundColor: p.neg,
                            },
                        }}
                    >
                        <Logout fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>
    );

    const defaultDrawerContent = (
        <Box>
            <Box
                sx={{
                    px: 2,
                    py: "18px",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                }}
            >
                <Typography
                    sx={{
                        fontSize: "1.15rem",
                        fontWeight: 700,
                        color: p.ink,
                    }}
                >
                    Helmac Admin
                </Typography>
            </Box>
            <Divider sx={{ borderColor: p.line }} />
            <List>
                {filteredMenuItems.map((item, index) => {
                    if ("divider" in item) {
                        return (
                            <Divider
                                key={index}
                                sx={{ my: 1, mx: 2, borderColor: p.lineSoft }}
                            />
                        );
                    }

                    const Icon = item.icon;
                    const isActive =
                        pathname === item.href ||
                        (item.href !== "/admin" &&
                            pathname.startsWith(item.href));

                    const elements = [
                        <ListItem key={item.href} disablePadding>
                            <ListItemLinkButton
                                href={item.href}
                                selected={isActive}
                                onClick={onClose}
                                sx={{
                                    ...drawerItemSx,
                                    ...(item.indented && { pl: 4 }),
                                }}
                            >
                                <ListItemIcon>
                                    <Icon />
                                </ListItemIcon>
                                <ListItemText primary={item.text} />
                            </ListItemLinkButton>
                        </ListItem>,
                    ];

                    if (item.href === "/admin/rocniky") {
                        elements.push(
                            <ListItem key="active-year" disablePadding>
                                {activeYearHref ? (
                                    <ListItemLinkButton
                                        href={activeYearHref}
                                        selected={activeYearIsActive}
                                        onClick={onClose}
                                        sx={{ ...drawerItemSx, pl: 4 }}
                                    >
                                        <ListItemIcon>
                                            <Today />
                                        </ListItemIcon>
                                        <ListItemText primary="Aktuální ročník" />
                                    </ListItemLinkButton>
                                ) : (
                                    <ListItemButton
                                        onClick={handleActiveYearClick}
                                        sx={{ ...drawerItemSx, pl: 4 }}
                                    >
                                        <ListItemIcon>
                                            <Today />
                                        </ListItemIcon>
                                        <ListItemText primary="Aktuální ročník" />
                                    </ListItemButton>
                                )}
                            </ListItem>
                        );
                    }

                    return elements;
                })}
            </List>
        </Box>
    );

    const sidebarContent = sidebarYear ? (
        <YearSidebar
            yearData={sidebarYear}
            onClose={onClose}
            userRole={userRole}
        />
    ) : (
        defaultDrawerContent
    );

    const drawerContent = (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <Box sx={{ flex: 1, overflow: "auto" }}>{sidebarContent}</Box>
            {userSection}
        </Box>
    );

    return (
        <Box
            component="nav"
            sx={{ width: { md: width }, flexShrink: { md: 0 } }}
        >
            {/* Mobile */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={onClose}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: "block", md: "none" },
                    "& .MuiDrawer-paper": {
                        width,
                        color: p.ink2,
                        backgroundColor: p.surface,
                        borderRight: `1px solid ${p.line}`,
                    },
                }}
            >
                {drawerContent}
            </Drawer>
            {/* Desktop */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: "none", md: "block" },
                    "& .MuiDrawer-paper": {
                        width,
                        boxSizing: "border-box",
                        color: p.ink2,
                        backgroundColor: p.surface,
                        borderRight: `1px solid ${p.line}`,
                    },
                }}
                open
            >
                {drawerContent}
            </Drawer>
        </Box>
    );
}
