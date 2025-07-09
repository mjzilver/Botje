const path = require("path")

module.exports = {
    testMatch: [
        "**/__tests__/**/*.test.js"
    ],
    testPathIgnorePatterns: [
        "/node_modules/",
        "<rootDir>/__tests__/mocks/"
    ],
    moduleNameMapper: {
        "^systems/(.*)$": path.join(__dirname, "systems/$1"),
    },
}
