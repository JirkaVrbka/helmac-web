import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
    {
        // Global ignores: never lint build output, leftover git worktrees, or
        // the static reference mockups — none of it is application source.
        ignores: ["**/.next*/**", ".claude/worktrees/**", "mockups/**"],
    },
    ...nextCoreWebVitals,
    ...nextTypescript,
    {
        rules: {
            "@next/next/no-page-custom-font": "off",
        },
    },
];

export default eslintConfig;
