import type { ICommand, IBotContext } from "../interfaces";
import type { BotMessage } from "../interfaces/discord";
import { EmbedBuilder } from "../interfaces/discord";
import { toError } from "../utils";
import { isGuildMessage } from "../interfaces/discord";
import { queryCache, CacheKey } from "../services/queryCache";
import { colorHex, formatDate, formatHour } from "../utils/helpers/stringHelpers";

interface StatsData {
    messageCount: number;
    reactionsGiven: number;
    reactionsReceived: number;
    firstSeen: number | null;
    peakHour: number | null;
}

async function fetchStats(userId: string, serverId: string, context: IBotContext): Promise<StatsData> {
    return queryCache(CacheKey.statsUser(serverId, userId), async () => {
        context.logger.debug(`Fetching stats for user ${userId} in server ${serverId}`);
        const [msgRows, reactGivenRows, reactReceivedRows, peakHourRows] = await Promise.all([
            context.database.query<{ count: string; first_seen: string }>(
                `SELECT COUNT(*) AS count, MIN(datetime) AS first_seen
             FROM messages
             WHERE server_id = $1 AND user_id = $2`,
                [serverId, userId],
            ),
            context.database.query<{ count: string }>(
                `SELECT COUNT(*) AS count
             FROM reactions
             WHERE user_id = $1`,
                [userId],
            ),
            context.database.query<{ count: string }>(
                `SELECT COUNT(*) AS count
             FROM reactions r
             JOIN messages m ON m.id = r.message_id
             WHERE m.user_id = $1 AND m.server_id = $2`,
                [userId, serverId],
            ),
            context.database.query<{ hour: string; count: string }>(
                `SELECT EXTRACT(HOUR FROM to_timestamp(datetime / 1000)) AS hour, COUNT(*) AS count
             FROM messages
             WHERE server_id = $1 AND user_id = $2
             GROUP BY hour
             ORDER BY count DESC
             LIMIT 1`,
                [serverId, userId],
            ),
        ]);

        const data = {
            messageCount: parseInt(msgRows[0]?.count ?? "0", 10),
            reactionsGiven: parseInt(reactGivenRows[0]?.count ?? "0", 10),
            reactionsReceived: parseInt(reactReceivedRows[0]?.count ?? "0", 10),
            firstSeen: msgRows[0]?.first_seen ? parseInt(msgRows[0].first_seen, 10) : null,
            peakHour: peakHourRows[0]?.hour != null ? parseInt(peakHourRows[0].hour, 10) : null,
        };
        context.logger.debug(
            `Stats for ${userId}: ${data.messageCount} msgs, ${data.reactionsGiven} given, ${data.reactionsReceived} received`,
        );

        return data;
    });
}

async function sendStats(
    message: BotMessage,
    targetId: string,
    targetName: string,
    context: IBotContext,
): Promise<void> {
    if (!isGuildMessage(message)) {
        context.messageHandler.reply(message, "This command can only be used in a server.");

        return;
    }

    try {
        const stats = await fetchStats(targetId, message.guild.id, context);

        const embed = new EmbedBuilder()
            .setColor(colorHex(context.config.color_hex))
            .setTitle(`📊 Stats for ${targetName}`)
            .addFields(
                {
                    name: "Messages sent",
                    value: stats.messageCount.toLocaleString(),
                    inline: true,
                },
                {
                    name: "Reactions given",
                    value: stats.reactionsGiven.toLocaleString(),
                    inline: true,
                },
                {
                    name: "Reactions received",
                    value: stats.reactionsReceived.toLocaleString(),
                    inline: true,
                },
                {
                    name: "First seen",
                    value: stats.firstSeen ? formatDate(stats.firstSeen) : "Unknown",
                    inline: true,
                },
                {
                    name: "Most active hour",
                    value: stats.peakHour != null ? formatHour(stats.peakHour) : "Unknown",
                    inline: true,
                },
            );
        context.messageHandler.send(message, embed);
    } catch (err) {
        context.logger.error(toError(err));
        context.messageHandler.reply(message, "Something went wrong, please try again.");
    }
}

export default {
    name: "stats",
    description: "Show activity stats for yourself or another user",
    format: "stats (@user)",
    async function(message, context) {
        const mentioned = message.mentions.users.first();
        if (mentioned) {
            const name = await context.userHandler.getDisplayName(mentioned.id, message.guild?.id ?? "");
            await sendStats(message, mentioned.id, name, context);
        } else {
            const name = await context.userHandler.getDisplayName(message.author.id, message.guild?.id ?? "");
            await sendStats(message, message.author.id, name, context);
        }
    },
} satisfies ICommand;
