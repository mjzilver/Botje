import tseslint from "typescript-eslint";

export default tseslint.config({
    files: ["src/**/*.ts"],
    ignores: ["src/json/**"],
    languageOptions: { parser: tseslint.parser },
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
        "lines-between-class-members": ["error", "always", { exceptAfterSingleLine: true }],
        "padding-line-between-statements": [
            "error",
            { blankLine: "always", prev: "*", next: "function" },
            { blankLine: "always", prev: "function", next: "*" },
            { blankLine: "always", prev: "multiline-expression", next: "multiline-expression" },
        ],
    },
});
