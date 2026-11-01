import { Container, Typography, Box, Button } from "@mui/material";
import { OpenInNew } from "@mui/icons-material";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageForm } from "@/components/forms/page-form";
import { PageHeader } from "@/components/admin/page-header";
import { builderPalette as p } from "@/components/admin/email-builder/palette";

interface EditPageProps {
    params: Promise<{ id: string; pageId: string }>;
}

async function getPageWithYear(pageId: string) {
    return db.page.findUnique({
        where: { id: pageId },
        include: {
            year: {
                select: { id: true, year: true, title: true },
            },
        },
    });
}

export default async function EditPagePage({ params }: EditPageProps) {
    const { id, pageId } = await params;
    const page = await getPageWithYear(pageId);

    if (!page || page.yearId !== id) {
        notFound();
    }

    return (
        <Container maxWidth="md">
            <PageHeader
                breadcrumbs={[
                    { label: "Rocniky", href: "/admin/rocniky" },
                    {
                        label: `${page.year.year}`,
                        href: `/admin/rocniky/${page.year.id}`,
                    },
                    { label: page.title },
                ]}
                title="Upravit stranku"
            />
            <Box sx={{ mb: 4 }}>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 2,
                        mb: 1,
                    }}
                >
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
                            backgroundColor: page.isPublished
                                ? p.value
                                : p.surface3,
                            color: page.isPublished ? p.valueInk : p.ink2,
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
                        {page.isPublished ? "Publikovano" : "Skryto"}
                    </Box>
                    <Button
                        href={`/${page.year.year}/${page.slug}`}
                        target="_blank"
                        variant="outlined"
                        startIcon={<OpenInNew />}
                        sx={{
                            borderRadius: "10px",
                            textTransform: "none",
                            color: p.ink2,
                            borderColor: p.line,
                            "&:hover": {
                                borderColor: p.ink3,
                                backgroundColor: p.surface2,
                            },
                        }}
                    >
                        Nahled
                    </Button>
                </Box>
                <Typography sx={{ color: p.ink2 }}>
                    {page.year.year} - {page.title}
                </Typography>
            </Box>

            <PageForm
                mode="edit"
                yearId={page.year.id}
                pageId={page.id}
                defaultValues={{
                    slug: page.slug,
                    title: page.title,
                    seoTitle: page.seoTitle,
                    seoDesc: page.seoDesc,
                    sortOrder: page.sortOrder,
                }}
            />
        </Container>
    );
}
