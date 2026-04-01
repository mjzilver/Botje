import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    { ignores: ["dist/**", "coverage/**", "node_modules/**"] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["src/**/*.ts"],
        rules: {
            "@typescript-eslint/no-unused-vars": "off",
            "no-empty": ["error", { allowEmptyCatch: true }],
            "padding-line-between-statements": [
                "error",
                { blankLine: "always", prev: "import", next: "*" },
                { blankLine: "any", prev: "import", next: "import" },
                { blankLine: "always", prev: "*", next: "export" },
                { blankLine: "any", prev: "export", next: "export" },
                { blankLine: "always", prev: "export", next: "*" },
                { blankLine: "always", prev: "block-like", next: "*" },
                { blankLine: "always", prev: "*", next: "return" },
                { blankLine: "any", prev: "block-like", next: "block-like" },
                { blankLine: "always", prev: "*", next: "function" },
                { blankLine: "always", prev: "*", next: "class" },
            ],
            "lines-between-class-members": ["error", "always", { exceptAfterSingleLine: true }],
        },
    },
);
