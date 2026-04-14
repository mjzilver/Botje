import { defineConfig } from "vitest/config"
import { resolve } from "path"

export default defineConfig({
    resolve: {
        alias: {
            "@test": resolve(__dirname, "src/__tests__"),
        },
    },
    test: {
        typecheck: { tsconfig: "./tsconfig.test.json" },
        globals: true,
        environment: "node",
        include: ["src/__tests__/**/*.test.ts", "src/**/*.spec.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "lcov"],
        },
    },
})
