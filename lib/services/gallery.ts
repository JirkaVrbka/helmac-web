import { cache } from "react";
import { db } from "@/lib/db";

const albumPreviewSelect = {
    id: true,
    slug: true,
    title: true,
    description: true,
    coverImage: true,
    ogImageUrl: true,
    externalUrl: true,
    year: {
        select: { year: true },
    },
} as const;

export const getAllPublishedAlbums = cache(async () => {
    const activeYear = await db.year.findFirst({
        where: { isActive: true, isArchived: false },
        select: { id: true },
    });

    const albums = await db.album.findMany({
        where: { isPublished: true },
        orderBy: { createdAt: "desc" },
        select: {
            ...albumPreviewSelect,
            yearId: true,
        },
    });

    if (!activeYear) return albums;

    // Move active-year albums to the front
    const activeYearAlbums = albums.filter((a) => a.yearId === activeYear.id);
    const otherAlbums = albums.filter((a) => a.yearId !== activeYear.id);
    return [...activeYearAlbums, ...otherAlbums];
});

export const getPublishedAlbums = cache(async (yearId: string) => {
    return db.album.findMany({
        where: {
            yearId,
            isPublished: true,
        },
        orderBy: { sortOrder: "asc" },
        select: albumPreviewSelect,
    });
});

export const getLatestAlbumsForActiveYear = cache(
    async (limit: number = 4) => {
        const activeYear = await db.year.findFirst({
            where: { isActive: true, isArchived: false },
            select: { id: true },
        });

        if (!activeYear) return [];

        return db.album.findMany({
            where: {
                yearId: activeYear.id,
                isPublished: true,
            },
            orderBy: { createdAt: "desc" },
            take: limit,
            select: albumPreviewSelect,
        });
    }
);
