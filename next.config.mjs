import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const storageUrl = process.env.NEXT_PUBLIC_STORAGE_URL;
const storageHost = storageUrl
    ? new URL(storageUrl).hostname
    : undefined;

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Build output dir; overridable so an isolated server (e.g. the Playwright
    // test server) can use its own `.next` and not collide with a running dev
    // server's lock. Defaults to ".next".
    distDir: process.env.NEXT_DIST_DIR || ".next",
    turbopack: {
        root: __dirname,
    },
    images: {
        remotePatterns: storageHost
            ? [{ protocol: "https", hostname: storageHost }]
            : [],
    },
};

export default nextConfig;
