import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: [
            "dist/**",
            "coverage/**",
            "node_modules/**",
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["src/**/*.ts"],
        plugins: {
            "@stylistic": stylistic,
        },
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
            "curly": ["error", "all"],
            "padding-line-between-statements": [
                "error",
                { blankLine: "always", prev: "import", next: "*" },
                { blankLine: "any", prev: "import", next: "import" },
                { blankLine: "always", prev: "block-like", next: "*" },
                { blankLine: "any", prev: "block-like", next: "block-like" },
                { blankLine: "always", prev: "*", next: "return" },
                { blankLine: "always", prev: "*", next: "function" },
                { blankLine: "always", prev: "*", next: "class" },
                { blankLine: "always", prev: "*", next: "export" },
                { blankLine: "always", prev: "export", next: "*" },
                { blankLine: "always", prev: "export", next: "export" },
            ],
            "@stylistic/indent": [
                "error",
                4,
                {
                    SwitchCase: 1,
                },
            ],
            "@stylistic/semi": ["error", "always"],
            "@stylistic/quotes": [
                "error",
                "double",
                {
                    avoidEscape: true,
                },
            ],
            "@stylistic/comma-dangle": [
                "error",
                "always-multiline",
            ],
            "@stylistic/comma-spacing": "error",
            "@stylistic/object-curly-spacing": [
                "error",
                "always",
            ],
            "@stylistic/array-bracket-spacing": [
                "error",
                "never",
            ],
            "@stylistic/space-before-blocks": "error",
            "@stylistic/space-in-parens": [
                "error",
                "never",
            ],
            "@stylistic/keyword-spacing": "error",
            "@stylistic/brace-style": [
                "error",
                "1tbs",
                {
                    allowSingleLine: false,
                },
            ],
            "@stylistic/lines-between-class-members": [
                "error",
                "always",
                {
                    exceptAfterSingleLine: true,
                },
            ],
            "no-multiple-empty-lines": [
                "error",
                {
                    max: 1,
                    maxEOF: 0,
                },
            ],
            "eol-last": [
                "error",
                "always",
            ],
        },
    },
);