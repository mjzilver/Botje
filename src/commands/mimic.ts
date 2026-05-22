import type { ICommand } from "../interfaces";
import { isGuildMessage } from "../interfaces/discord";
import { pickRandomItem, toError } from "../systems/utils";
import {
    cleanMessage,
    buildStyleProfile,
    buildChain,
    generate,
    isVerbatimRepeat,
    MIN_MESSAGES,
    MAX_RETRIES,
} from "../systems/mimicBuilder";
import type { CachedProfile } from "../systems/mimicBuilder";
import { mimicCache } from "../systems/mimicCache";

export default {
    name: "mimic",
    description: "generates a message in a user's style based on their message history",
    format: "mimic (@user)",
    options: [
        {
            type: "user",
            name: "user",
            description: "The user whose style to mimic (optional — picks random if omitted)",
            required: false,
        },
    ],
    async function(message, context) {
        if (!isGuildMessage(message)) {
            context.messageHandler.reply(message, "This command can only be used in a server.");

            return;
        }

        let targetId: string;
        const mentioned = message.mentions.users.first();

        if (mentioned) {
            targetId = mentioned.id;
        } else {
            const candidates = await context.database.query<{ user_id: string }>(
                `SELECT DISTINCT user_id FROM messages
                 WHERE server_id = $1
                 AND LENGTH(message) > 15
                 ORDER BY RANDOM()
                 LIMIT 20`,
                [message.guild.id],
            );

            if (candidates.length === 0) {
                context.messageHandler.reply(message, "No message history found for this server.");

                return;
            }

            targetId = pickRandomItem(candidates).user_id;
        }

        if (targetId === context.client.user?.id) {
            context.messageHandler.reply(message, "I refuse to mimic myself.");

            return;
        }

        try {
            const cached = mimicCache.get(targetId);

            if (cached !== null && !mimicCache.isExpired(cached)) {
                replyFromProfile(cached);

                return;
            }

            if (cached !== null) {
                replyFromProfile(cached);
                mimicCache.enqueue(
                    targetId,
                    context.database,
                    context.logger,
                    context.config.prefix,
                );

                return;
            }

            const rows = await context.database.query<{ message: string }>(
                `SELECT message FROM messages
                 WHERE user_id = $1
                 AND LENGTH(message) > 15
                 ORDER BY RANDOM()
                 LIMIT 5000`,
                [targetId],
            );

            const cleaned = rows
                .map((r) => cleanMessage(r.message, context.config.prefix))
                .filter((m): m is string => m !== null);

            if (cleaned.length < MIN_MESSAGES) {
                const displayName = await context.userHandler.getDisplayName(targetId, message.guild.id);
                context.messageHandler.reply(
                    message,
                    `Not enough saved messages to mimic **${displayName}** — they need to chat more.`,
                );

                return;
            }

            const style = buildStyleProfile(cleaned);
            const { chain, starts } = buildChain(cleaned);

            if (starts.length === 0) {
                context.messageHandler.reply(message, "Not enough varied messages to generate a mimic.");

                return;
            }

            let generated = generate(chain, starts, style.targetWordCount, style);
            for (let attempt = 1; attempt < MAX_RETRIES && isVerbatimRepeat(generated, cleaned); attempt++) {
                context.logger.debug(`Mimic verbatim repeat detected (attempt ${attempt}), regenerating`);
                generated = generate(chain, starts, style.targetWordCount, style);
            }
            context.messageHandler.send(message, generated);

            const profile: CachedProfile = { chain, starts, style, builtAt: Date.now(), messageCount: cleaned.length };
            await mimicCache.enqueueWithProfile(targetId, profile, context.database, context.logger, context.config.prefix);
        } catch (err) {
            context.logger.error(toError(err));
        }

        function replyFromProfile(profile: CachedProfile): void {
            const result = generate(profile.chain, profile.starts, profile.style.targetWordCount, profile.style);
            context.messageHandler.send(message, result);
        }
    },
} satisfies ICommand;
