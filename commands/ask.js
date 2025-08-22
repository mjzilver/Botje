const bot = require("../systems/bot")
const logger = require("../systems/logger")
const { config } = require("../systems/settings")

async function buildChain(message) {
    const username = message.author.bot ? "bot" : "user"
    let chain = `${username}: ${message.content.removeCommand()}`

    if (message.reference && message.reference.messageId) {
        try {
            const prev = await message.channel.messages.fetch(message.reference.messageId)
            chain = `${await buildChain(prev)}\n${chain}`
        } catch (err) {
            console.warn("Could not fetch referenced message:", err)
        }
    }

    return chain
}
const bannedPhrases = ["bot:", "user:", "dolphin:", "[user]:", "[bot]:"];
function filterBotReply(filtered) {
    for (const phrase of bannedPhrases) {
        filtered = filtered.replace(new RegExp(phrase, "gi"), "").trim()
    }
    return filtered || "thinking...";
}

module.exports = {
    "name": "ask",
    "description": "asks via an LLM",
    "format": "ask (text)",
    "function": async function ask(message) {
        let userQuestion;
        let promptTemplate;

        if (message.reference?.messageId) {
            userQuestion = await buildChain(message);
            promptTemplate = config.llm.conversation_prompt;
        } else {
            userQuestion = message.content.removeCommand();
            promptTemplate = config.llm.base_prompt;
        }

        const prompt = promptTemplate.replace("{userQuestion}", userQuestion);

        const discordMsg = await bot.messageHandler.reply(message, "Thinking...");
        const controller = new AbortController();
        const signal = controller.signal;

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
                            accumulated += json.response;
                            const filtered = filterBotReply(firstChunk ? json.response : accumulated);

                            try {
                                await bot.messageHandler.edit(discordMsg, filtered);
                                firstChunk = false;
                            } catch (err) {
                                logger.error("Message edit failed, aborting stream:", err);
                                controller.abort();
                                break;
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
