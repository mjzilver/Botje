const bot = require("../systems/bot")
const llm = require("../systems/llm")
const logger = require("../systems/logger")
const { config } = require("../systems/settings")

async function buildChain(message) {
    const username = message.author.bot ? "bot" : "user"
    let chain = `${username}: ${message.content.removeCommand()}`

    if (message.reference && message.reference.messageId)
        try {
            const prev = await message.channel.messages.fetch(message.reference.messageId)
            chain = `${await buildChain(prev)}\n${chain}`
        } catch (err) {
            logger.warn("Could not fetch referenced message:", err)
        }

    return chain
}
const bannedPhrases = ["bot:", "user:", "[user]:", "[bot]:"]
function filterBotReply(filtered) {
    for (const phrase of bannedPhrases)
        filtered = filtered.replace(new RegExp(phrase, "gi"), "").trim()

    return filtered || "thinking..."
}

module.exports = {
    "name": "ask",
    "description": "asks via an LLM",
    "format": "ask (text)",
    "options": [
        { type: "string", name: "question", description: "Your question", required: true }
    ],
    "function": async function ask(message) {
        let userQuestion
        let promptTemplate

        if (message.reference?.messageId) {
            userQuestion = await buildChain(message)
            promptTemplate = config.llm.conversation_prompt
        } else {
            userQuestion = message.content.removeCommand()
            promptTemplate = config.llm.base_prompt
        }

        const prompt = promptTemplate.replace("{userQuestion}", userQuestion)

        const discordMsg = await bot.messageHandler.reply(message, "Thinking...")

        try {
            await llm.streamToMessage(discordMsg, prompt, filterBotReply)
            await discordMsg.react("🤖")
        } catch (err) {
            await bot.messageHandler.edit(discordMsg, "Error contacting LLM.")
        }
    }
}
