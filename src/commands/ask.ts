import type { ICommand, IBotContext } from "../interfaces";
import { makeStringHelpers } from "../utils/helpers/stringHelpers";
import { toError } from "../utils";
import type { BotMessage } from "../interfaces/discord";

const bannedPhrases = ["bot:", "user:", "[user]:", "[bot]:"];

function filterBotReply(filtered: string): string {
    for (const phrase of bannedPhrases) filtered = filtered.replace(new RegExp(phrase, "gi"), "").trim();

    return filtered || "thinking...";
}

async function buildChain(
    message: BotMessage,
    removeCommandFn: (s: string) => string,
    context: IBotContext,
): Promise<string> {
    const username = message.author?.bot ? "bot" : "user";
    let chain = `${username}: ${removeCommandFn(message.content)}`;
    if (message.reference?.messageId) {
        try {
            const prev = await message.channel.messages.fetch(message.reference.messageId);
            chain = `${await buildChain(prev, removeCommandFn, context)}\n${chain}`;
        } catch (err) {
            context.logger.warn(
                `Could not fetch referenced message: ${err instanceof Error ? err.message : String(err)}`,
            );
        }
    }

    return chain;
}

export default {
    name: "ask",
    description: "asks the LLM a question",
    format: "ask (text)",
    options: [{ type: "string", name: "question", description: "Your question", required: true }],
    async function(message, context) {
        const { removeCommand } = makeStringHelpers(context.config);
        let userQuestion: string;
        let promptTemplate: string;
        if (message.reference?.messageId) {
            userQuestion = await buildChain(message, removeCommand, context);
            promptTemplate = context.config.llm?.conversation_prompt ?? "";
        } else {
            userQuestion = removeCommand(message.content);
            promptTemplate = context.config.llm?.base_prompt ?? "";
        }

        const prompt = promptTemplate.replace("{userQuestion}", userQuestion);
        const thinkingMsg = await context.messageHandler.reply(message, "Thinking...");
        if (!thinkingMsg) return;
        try {
            const result = await context.llm.streamToMessage(thinkingMsg, prompt, filterBotReply);
            if (result) await context.messageHandler.react(thinkingMsg, "🤖");
        } catch (err) {
            context.logger.error(toError(err));
            await context.messageHandler.edit(thinkingMsg, "Error contacting LLM.");
        }
    },
} satisfies ICommand;
