import type { IClCommand, IBotContext } from "../../interfaces";
import type { BotGuildTextChannel } from "../../interfaces/discord";
import { getTextChannels } from "../../systems/messageAdapter";

function findChannel(input: string, context: IBotContext): BotGuildTextChannel | undefined {
    const channels = getTextChannels(context.client);

    return (
        channels.find((ch) => ch.id === input) ?? channels.find((ch) => ch.name.toLowerCase() === input.toLowerCase())
    );
}

function findUserId(input: string, guildId: string, context: IBotContext): string | undefined {
    const guild = context.client.guilds.cache.get(guildId);
    if (!guild) return undefined;
    if (guild.members.cache.has(input)) return input;

    for (const [, member] of guild.members.cache) {
        if (
            member.displayName.toLowerCase() === input.toLowerCase() ||
            member.user.username.toLowerCase() === input.toLowerCase()
        )
            return member.user.id;
    }

    return undefined;
}

async function randomMessage(context: IBotContext): Promise<string | null> {
    const earliest = new Date();
    earliest.setMonth(earliest.getMonth() - 5);
    const rows = await context.database.queryRandomMessage<{ message: string }>(
        `SELECT message FROM messages
         WHERE message NOT LIKE '%http%' AND message NOT LIKE '%www%' AND message NOT LIKE '%bot%'
         AND message LIKE '%_ _%' AND message LIKE '%_ _%_%'
         AND datetime < $1 AND LENGTH(message) > 10`,
        [earliest.getTime()],
    );

    return rows[0]?.message ?? null;
}

export default {
    name: "say",
    description: "sends a message as a user via webhook",
    format: "say <channel> <user> [message]",
    async function(input: string[], context: IBotContext) {
        const [channelInput, userInput, ...messageParts] = input;
        if (!channelInput || !userInput) {
            context.logger.console("Usage: say <channel> <user> [message]");

            return;
        }

        const channel = findChannel(channelInput, context);
        if (!channel) {
            context.logger.console(`Channel not found: ${channelInput}`);

            return;
        }

        const userId = findUserId(userInput, channel.guild.id, context);
        if (!userId) {
            context.logger.console(`User not found in guild: ${userInput}`);

            return;
        }

        const message = messageParts.length > 0 ? messageParts.join(" ") : await randomMessage(context);
        if (!message) {
            context.logger.console("No message provided and no random message found");

            return;
        }

        const sent = await context.webhook.sendMessage(channel.id, message, userId);
        context.logger.console(sent ? `Sent as ${userInput} in #${channel.name}` : "Failed to send message");
    },
    completer(argIndex: number, context: IBotContext): string[] {
        if (argIndex === 0) {
            return getTextChannels(context.client).map((ch) => ch.name);
        }

        if (argIndex === 1) {
            const seen = new Set<string>();
            for (const [, guild] of context.client.guilds.cache)
                for (const [, member] of guild.members.cache) seen.add(member.displayName || member.user.username);

            return [...seen];
        }

        return [];
    },
} satisfies IClCommand;
