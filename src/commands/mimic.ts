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
                `SELECT user_id FROM (
                     SELECT DISTINCT user_id FROM messages
                     WHERE server_id = $1
                     AND LENGTH(message) > 15
                 ) t
                 ORDER BY RANDOM()
                 LIMIT 20`,
                [message.guild.id],
            );

            const eligible = candidates.filter((c) => {
                if (c.user_id === context.client.user?.id) return false;
                const u = context.client.users.cache.get(c.user_id);
                if (u?.bot) return false;
                if (u && /^deleted.?user/i.test(u.username)) return false;
                if (!context.client.guilds.cache.some((g) => g.members.cache.has(c.user_id))) return false;
                return true;
            });

            if (eligible.length === 0) {
                context.messageHandler.reply(message, "No eligible users found to mimic in this server.");
                return;
            }

            targetId = pickRandomItem(eligible).user_id;
        }

        if (targetId === context.client.user?.id) {
            context.messageHandler.reply(message, "I refuse to mimic myself.");

            return;
        }

        const targetUser = context.client.users.cache.get(targetId);
        if (targetUser?.bot) {
            context.messageHandler.reply(message, "Bots don't have a writing style worth mimicking.");

            return;
        }

        try {
            const displayName = await context.userHandler.getDisplayName(targetId, message.guild.id);
            const cached = mimicCache.get(targetId);

            if (cached !== null && !mimicCache.isExpired(cached)) {
                replyFromProfile(cached, displayName);

                return;
            }

            if (cached !== null) {
                replyFromProfile(cached, displayName);
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
            replyFromProfile({ chain, starts, style, builtAt: Date.now(), messageCount: cleaned.length }, displayName, generated);

            const profile: CachedProfile = { chain, starts, style, builtAt: Date.now(), messageCount: cleaned.length };
            await mimicCache.enqueueWithProfile(targetId, profile, context.database, context.logger, context.config.prefix);
        } catch (err) {
            context.logger.error(toError(err));
        }

        function replyFromProfile(profile: CachedProfile, displayName: string, pregenerated?: string): void {
            const result = pregenerated ?? generate(profile.chain, profile.starts, profile.style.targetWordCount, profile.style);
            context.messageHandler.send(message, `*mimicking **${displayName}***\n${result}`);
        }
    },
} satisfies ICommand;
