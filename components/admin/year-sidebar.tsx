"use client";

import { usePathname } from "next/navigation";
import {
    Box,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
} from "@mui/material";
import {
    ArrowBack,
    Article,
    BarChart,
    CalendarMonth,
    ViewList,
    Newspaper,
    PhotoLibrary,
    PlaylistPlay,
    AppRegistration,
    Description,
    People,
    Receipt,
    CheckCircleOutline,
    HowToReg,
    Email,
    MarkEmailRead,
    PriceChange,
    Payment,
    ForwardToInbox,
    Send,
    Settings,
} from "@mui/icons-material";
import { ListItemLinkButton } from "@/components/ui/link-button";
import type { SidebarYearData } from "@/lib/contexts/sidebar-context";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

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

interface YearSidebarProps {
    yearData: SidebarYearData;
    onClose: () => void;
    userRole?: string;
}

export function YearSidebar({ yearData, onClose, userRole }: YearSidebarProps) {
    const pathname = usePathname();
    const base = `/admin/rocniky/${yearData.id}`;

    const isExactMatch = (href: string) => pathname === href;
    const isPrefixMatch = (href: string) =>
        pathname.startsWith(href + "/") || pathname === href;

    const mainItems = [
        { text: "Přehled", href: base, icon: BarChart, exact: true },
    ];

    const contentItems = [
        { text: "Obsah", href: `${base}/obsah`, icon: Article, exact: true },
        {
            text: "Úvodní stránka",
            href: `${base}/uvod`,
            icon: PlaylistPlay,
            indented: true,
        },
        {
            text: "Program",
            href: `${base}/program`,
            icon: CalendarMonth,
            indented: true,
        },
        {
            text: "Sekce",
            href: `${base}/sekce`,
            icon: ViewList,
            indented: true,
        },
        {
            text: "Novinky",
            href: `${base}/novinky`,
            icon: Newspaper,
            indented: true,
        },
        {
            text: "Galerie",
            href: `${base}/galerie`,
            icon: PhotoLibrary,
            indented: true,
        },
    ];

    const registrationItems = [
        {
            text: "Registrace",
            href: `${base}/registrace`,
            icon: AppRegistration,
            exact: true,
            roles: ["SUPER_ADMIN", "ADMIN"],
        },
        {
            text: "Formulář",
            href: `${base}/registrace/formular`,
            icon: Description,
            indented: true,
        },
        {
            text: "Přihlášky",
            href: `${base}/registrace/prihlasky`,
            icon: People,
            indented: true,
            roles: ["SUPER_ADMIN", "ADMIN", "EDITOR"],
        },
        {
            text: "Transakce",
            href: `${base}/registrace/transakce`,
            icon: Receipt,
            indented: true,
            roles: ["SUPER_ADMIN", "ADMIN"],
        },
        {
            text: "Účast",
            href: `${base}/registrace/ucast`,
            icon: HowToReg,
            indented: true,
            roles: ["SUPER_ADMIN", "ADMIN"],
        },
        {
            text: "Úspěšná registrace",
            href: `${base}/registrace/success-page`,
            icon: CheckCircleOutline,
            indented: true,
        },
    ].filter(
        (item) => !item.roles || (userRole && item.roles.includes(userRole))
    );

    const emailItems: {
        text: string;
        href: string;
        icon: typeof Email;
        exact?: boolean;
        indented?: boolean;
        roles?: string[];
    }[] = [
        { text: "Emaily", href: `${base}/emaily`, icon: Email, exact: true },
        {
            text: "Potvrzovací",
            href: `${base}/emaily/potvrzovaci`,
            icon: MarkEmailRead,
            indented: true,
        },
        {
            text: "Změna ceny",
            href: `${base}/emaily/zmena-ceny`,
            icon: PriceChange,
            indented: true,
        },
        {
            text: "Platba",
            href: `${base}/emaily/platba`,
            icon: Payment,
            indented: true,
        },
        {
            text: "Hromadné",
            href: `${base}/emaily/hromadne`,
            icon: Send,
            indented: true,
            roles: ["SUPER_ADMIN", "ADMIN"],
        },
        ...yearData.conditionalEmails.map((ce) => ({
            text: ce.name,
            href: `${base}/emaily/podmineny/${ce.id}`,
            icon: ForwardToInbox,
            indented: true,
        })),
    ].filter(
        (item) => !item.roles || (userRole && item.roles.includes(userRole))
    );

    return (
        <Box>
            {/* Back link */}
            <List disablePadding>
                <ListItem disablePadding>
                    <ListItemLinkButton
                        href="/admin/rocniky"
                        onClick={onClose}
                        sx={{ ...drawerItemSx, py: 1.5 }}
                    >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                            <ArrowBack fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                            primary="Zpět na ročníky"
                            primaryTypographyProps={{ variant: "body2" }}
                        />
                    </ListItemLinkButton>
                </ListItem>
            </List>
            <Divider sx={{ borderColor: p.line }} />

            {/* Main navigation */}
            <List>
                {mainItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.exact
                        ? isExactMatch(item.href)
                        : isPrefixMatch(item.href);
                    return (
                        <ListItem key={item.href} disablePadding>
                            <ListItemLinkButton
                                href={item.href}
                                selected={isActive}
                                onClick={onClose}
                                sx={drawerItemSx}
                            >
                                <ListItemIcon>
                                    <Icon />
                                </ListItemIcon>
                                <ListItemText primary={item.text} />
                            </ListItemLinkButton>
                        </ListItem>
                    );
                })}
            </List>
            <Divider sx={{ mx: 2, borderColor: p.lineSoft }} />

            {/* Content section */}
            <List>
                {contentItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.exact
                        ? isExactMatch(item.href)
                        : isPrefixMatch(item.href);
                    return (
                        <ListItem key={item.href} disablePadding>
                            <ListItemLinkButton
                                href={item.href}
                                selected={isActive}
                                onClick={onClose}
                                sx={{
                                    ...drawerItemSx,
                                    ...(item.indented ? { pl: 4 } : {}),
                                }}
                            >
                                <ListItemIcon>
                                    <Icon />
                                </ListItemIcon>
                                <ListItemText primary={item.text} />
                            </ListItemLinkButton>
                        </ListItem>
                    );
                })}
            </List>
            <Divider sx={{ mx: 2, borderColor: p.lineSoft }} />

            {/* Registration section */}
            <List>
                {registrationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.exact
                        ? isExactMatch(item.href)
                        : isPrefixMatch(item.href);
                    return (
                        <ListItem key={item.href} disablePadding>
                            <ListItemLinkButton
                                href={item.href}
                                selected={isActive}
                                onClick={onClose}
                                sx={{
                                    ...drawerItemSx,
                                    ...(item.indented ? { pl: 4 } : {}),
                                }}
                            >
                                <ListItemIcon>
                                    <Icon />
                                </ListItemIcon>
                                <ListItemText primary={item.text} />
                            </ListItemLinkButton>
                        </ListItem>
                    );
                })}
            </List>
            <Divider sx={{ mx: 2, borderColor: p.lineSoft }} />

            {/* Email section */}
            <List>
                {emailItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.exact
                        ? isExactMatch(item.href)
                        : isPrefixMatch(item.href);
                    return (
                        <ListItem key={item.href} disablePadding>
                            <ListItemLinkButton
                                href={item.href}
                                selected={isActive}
                                onClick={onClose}
                                sx={{
                                    ...drawerItemSx,
                                    ...(item.indented ? { pl: 4 } : {}),
                                }}
                            >
                                <ListItemIcon>
                                    <Icon />
                                </ListItemIcon>
                                <ListItemText primary={item.text} />
                            </ListItemLinkButton>
                        </ListItem>
                    );
                })}
            </List>
            <Divider sx={{ mx: 2, borderColor: p.lineSoft }} />

            {/* Settings */}
            <List>
                <ListItem disablePadding>
                    <ListItemLinkButton
                        href={`${base}/nastaveni`}
                        selected={isPrefixMatch(`${base}/nastaveni`)}
                        onClick={onClose}
                        sx={drawerItemSx}
                    >
                        <ListItemIcon>
                            <Settings />
                        </ListItemIcon>
                        <ListItemText primary="Nastavení" />
                    </ListItemLinkButton>
                </ListItem>
            </List>
        </Box>
    );
}
