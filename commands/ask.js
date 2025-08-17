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

        try {
            const response = await fetch(config.llm.api, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "dolphin-llama3",
                    prompt: prompt,
                    stream: true
                })
            })

            const reader = response.body.getReader()
            const decoder = new TextDecoder("utf-8")
            let firstChunk = true
            let accumulated = ""
            let finished = false

            while (!finished) {
                const { done, value } = await reader.read()
                if (done) {
                    finished = done
                    break
                }

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
                            if (firstChunk) {
                                await bot.messageHandler.edit(discordMsg, json.response)
                                firstChunk = false
                            } else {
                                await bot.messageHandler.edit(discordMsg, accumulated)
                            }
                        }
                    } catch (err) {
                        logger.warn("Skipping invalid JSON line:", line, err)
                    }
            }

            await discordMsg.react("🤖")
        } catch (err) {
            logger.error("Failed to contact LLM:", err)
            await bot.messageHandler.edit(discordMsg, "Error contacting LLM.")
        }
    }
}
