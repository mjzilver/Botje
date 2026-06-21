import type { ICommand } from "../interfaces";
import { isGuildMessage } from "../interfaces/discord";
import { pickRandomItem, toError } from "../utils";
import { isEligibleMimicTarget } from "../features/mimic/mimicBuilder";
import { generateMimicMessage } from "../features/mimic/textGenerationService";

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

            const eligible = candidates.filter((c) =>
                isEligibleMimicTarget(
                    c.user_id,
                    context.client.user?.id,
                    (id) => context.client.users.cache.get(id),
                    (id) => message.guild.members.cache.has(id),
                ),
            );

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
            const result = await generateMimicMessage(targetId, context);
            if (!result) {
                context.messageHandler.reply(message, "Not enough message history to generate a mimic.");

                return;
            }

            const sent = await context.webhook.sendMessage(message.channel.id, result, targetId);
            if (sent) context.messageHandler.markComplete(message);
            else {
                const user = context.client.users.cache.get(targetId);
                const displayName = user?.username ?? targetId;
                context.messageHandler.send(message, `"${result}" — ${displayName}`);
            }
        } catch (err) {
            context.logger.error(toError(err));
        }
    },
} satisfies ICommand;
