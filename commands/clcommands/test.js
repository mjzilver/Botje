const { exec } = require("child_process")
const fs = require("fs")
const path = require("path")

const logger = require("../../systems/logger.js")

module.exports = {
    name: "test",
    description: "Run tests and report summary",
    format: "test",
    function: () => {
        logger.debug("Running tests...")

        const resultsDir = "./test_results"
        const resultsFile = path.join(resultsDir, "jest-results.json")

        if (!fs.existsSync(resultsDir))
            fs.mkdirSync(resultsDir, { recursive: true })

        exec(`npx jest --json --outputFile=${resultsFile}`, error => {
            if (error) {
                logger.error(`Error running tests: ${error.message}`)
                return
            }

            fs.readFile(resultsFile, "utf8", (err, data) => {
                if (err) {
                    logger.error(`Failed to read test results file: ${err.message}`)
                    return
                }

                try {
                    const results = JSON.parse(data)
                    logger.console(`Test Results: ${results.numPassedTests || 0} passed, ${results.numFailedTests || 0} failed.`)
                } catch (parseErr) {
                    logger.error(`Error parsing test results JSON: ${parseErr.message}`)
                }
            })
        })
    }
}
