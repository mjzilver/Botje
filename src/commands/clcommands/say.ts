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

export default {
    name: "say",
    description: "sends a message as a user via webhook",
    format: "say <channel> <user> <message>",
    async function(input: string[], context: IBotContext) {
        const [channelInput, userInput, ...messageParts] = input;
        if (!channelInput || !userInput || messageParts.length === 0) {
            context.logger.console("Usage: say <channel-id-or-name> <user-id-or-name> <message>");

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

        const message = messageParts.join(" ");
        const sent = await context.webhook.sendMessage(channel.id, message, userId);
        context.logger.console(sent ? `Sent as user ${userId} in #${channel.name}` : "Failed to send message");
    },
    completer(argIndex: number, context: IBotContext): string[] {
        if (argIndex === 0) {
            return getTextChannels(context.client).flatMap((ch) => [ch.id, ch.name]);
        }

        if (argIndex === 1) {
            const seen = new Set<string>();
            for (const [, guild] of context.client.guilds.cache) {
                for (const [, member] of guild.members.cache) {
                    seen.add(member.user.id);
                    seen.add(member.displayName);
                    seen.add(member.user.username);
                }
            }

            return [...seen];
        }

        return [];
    },
} satisfies IClCommand;
