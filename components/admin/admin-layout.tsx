"use client";

import { useState } from "react";
import { Box, Toolbar } from "@mui/material";
import { SnackbarProvider } from "notistack";
import { SidebarContextProvider } from "@/lib/contexts/sidebar-context";
import { AdminAppBar } from "./admin-app-bar";
import { AdminDrawer } from "./admin-drawer";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

const DRAWER_WIDTH = 260;

interface AdminLayoutProps {
    children: React.ReactNode;
    userName?: string;
    userRole?: string;
    activeYearId?: string;
}

export function AdminLayout({
    children,
    userName,
    userRole,
    activeYearId,
}: AdminLayoutProps) {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <SnackbarProvider
            maxSnack={3}
            autoHideDuration={4000}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
            <SidebarContextProvider>
                <Box sx={{ display: "flex", minHeight: "100vh" }}>
                    <AdminAppBar
                        drawerWidth={DRAWER_WIDTH}
                        onMenuClick={() => setMobileOpen(!mobileOpen)}
                    />
                    <AdminDrawer
                        width={DRAWER_WIDTH}
                        mobileOpen={mobileOpen}
                        onClose={() => setMobileOpen(false)}
                        userRole={userRole}
                        userName={userName}
                        activeYearId={activeYearId}
                    />
                    <Box
                        component="main"
                        sx={{
                            flexGrow: 1,
                            p: { xs: 2, sm: 3 },
                            width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
                            backgroundColor: p.surface2,
                            overflowX: "clip",
                        }}
                    >
                        <Toolbar />
                        {children}
                    </Box>
                </Box>
            </SidebarContextProvider>
        </SnackbarProvider>
    );
}
