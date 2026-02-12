const logger = require("./logger")
const { config } = require("./settings")

async function streamToMessage(message, prompt, filterFn = null) {
    const controller = new AbortController()
    const signal = controller.signal

    try {
        const response = await fetch(config.llm.api, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: config.llm.model,
                prompt: prompt,
                stream: true
            }),
            signal: signal
        })

        const reader = response.body.getReader()
        const decoder = new TextDecoder("utf-8")
        let firstChunk = true
        let accumulated = ""
        let shouldAbort = false

        while (true) {
            if (shouldAbort)
                break

            const { done, value } = await reader.read()
            if (done)
                break

            const chunk = decoder.decode(value, { stream: true }).trim()
            if (!chunk) continue

            for (const line of chunk.split("\n")) {
                if (shouldAbort)
                    break

                try {
                    const json = JSON.parse(line)
                    if (json.error) {
                        logger.error(`LLM error: ${json.error}`)
                        throw new Error(json.error)
                    }

                    if (json.response) {
                        accumulated += json.response
                        const toDisplay = filterFn
                            ? filterFn(firstChunk ? json.response : accumulated)
                            : accumulated

                        try {
                            await message.edit(toDisplay)
                            firstChunk = false
                        } catch (err) {
                            logger.debug(`Message edit failed (likely deleted), aborting stream: ${err.message}`)

                            controller.abort()
                            shouldAbort = true
                            break
                        }
                    }
                } catch (err) {
                    if (err.message.includes("LLM error"))
                        throw err
                    logger.warn("Skipping invalid JSON line:", line, err)
                }
            }
        }

        return accumulated
    } catch (err) {
        if (err.name === "AbortError") {
            logger.info("Stream aborted.")
        } else {
            logger.error("Failed to contact LLM:", err)
            throw err
        }
    }
}

module.exports = {
    streamToMessage
}
