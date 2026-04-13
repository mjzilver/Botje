import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        include: ["src/__tests__/**/*.test.ts", "src/**/*.spec.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "lcov"],
        },
    },
})
