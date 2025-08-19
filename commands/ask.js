const bot = require("../systems/bot")
const logger = require("../systems/logger")
const { config } = require("../systems/settings")

module.exports = {
    "name": "ask",
    "description": "asks via an LLM",
    "format": "ask (text)",
    "function": async function ask(message) {
        const userQuestion = message.content.removePrefix().replace(/^ask /g, "")
        const prompt = config.llm.base_prompt.replace("{userQuestion}", userQuestion)

        logger.info(`Sending prompt to LLM: "${prompt}"`)
        const discordMsg = await bot.messageHandler.reply(message, "Thinking...")

        const controller = new AbortController()
        const signal = controller.signal

        try {
            const response = await fetch(config.llm.api, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "dolphin-llama3",
                    prompt: prompt,
                    stream: true
                }),
                signal: signal
            })

            const reader = response.body.getReader()
            const decoder = new TextDecoder("utf-8")
            let firstChunk = true
            let accumulated = ""

            while (true) {
                const { done, value } = await reader.read()
                if (done)
                    break

                const chunk = decoder.decode(value, { stream: true }).trim()
                if (!chunk) continue

                for (const line of chunk.split("\n"))
                    try {
                        const json = JSON.parse(line)
                        if (json.error) {
                            logger.error(`LLM error: ${json.error}`)
                            return bot.messageHandler.edit(discordMsg, `LLM error: ${json.error}`)
                        }

                        if (json.response) {
                            accumulated += json.response
                            try {
                                if (firstChunk) {
                                    await bot.messageHandler.edit(discordMsg, json.response)
                                    firstChunk = false
                                } else {
                                    await bot.messageHandler.edit(discordMsg, accumulated)
                                }
                            } catch (err) {
                                logger.error("Message edit failed, aborting stream:", err)
                                controller.abort()
                                break
                            }
                        }
                    } catch (err) {
                        logger.warn("Skipping invalid JSON line:", line, err)
                    }
            }

            await discordMsg.react("🤖")
        } catch (err) {
            if (err.name === "AbortError") {
                logger.info("Stream aborted.")
            } else {
                logger.error("Failed to contact LLM:", err)
                await bot.messageHandler.edit(discordMsg, "Error contacting LLM.")
            }
        }
    }
}
