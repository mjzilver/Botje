module.exports = {
    testMatch: [
        "**/__tests__/**/*.test.js"
    ],
    testPathIgnorePatterns: [
        "/node_modules/",
        "<rootDir>/__tests__/mocks/"
    ],
    collectCoverageFrom: [
        "systems/**/*.js",
        "!systems/web/**/*.js",
        "!**/*.test.js",
    ]
}
