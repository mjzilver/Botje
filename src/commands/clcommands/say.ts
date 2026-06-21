import type { IClCommand, IBotContext } from "../../interfaces";
import { findChannel, getTextChannels } from "../../adapters/messageAdapter";
import { generateMimicMessage } from "../../features/mimic/textGenerationService";

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
    format: "say <channel> <user> [message]",
    async function(input: string[], context: IBotContext) {
        const [channelInput, ...rest] = input;
        if (!channelInput || rest.length === 0) {
            context.logger.console("Usage: say <channel> <user> [message]");

            return;
        }

        const channel = findChannel(channelInput, context.client);
        if (!channel) {
            context.logger.console(`Channel not found: ${channelInput}`);

            return;
        }

        let userId: string | undefined;
        let messageStartIndex = 0;
        for (let i = rest.length; i >= 1; i--) {
            const candidate = rest.slice(0, i).join(" ");
            const found = findUserId(candidate, channel.guild.id, context);
            if (found) {
                userId = found;
                messageStartIndex = i;
                break;
            }
        }

        if (!userId) {
            context.logger.console(`User not found in guild: ${rest.join(" ")}`);

            return;
        }

        const messageParts = rest.slice(messageStartIndex);
        const message = messageParts.length > 0 ? messageParts.join(" ") : await generateMimicMessage(userId, context);
        if (!message) {
            context.logger.console("No message provided and could not generate a mimic");

            return;
        }

        const sent = await context.webhook.sendMessage(channel.id, message, userId);
        context.logger.console(
            sent
                ? `Sent as ${rest.slice(0, messageStartIndex).join(" ")} in #${channel.name}`
                : "Failed to send message",
        );
    },
    completer(argIndex: number, context: IBotContext, input: string[]): string[] {
        if (argIndex === 0) {
            return getTextChannels(context.client).map((ch) => ch.name);
        }

        if (argIndex === 1) {
            const channel = input[0] ? findChannel(input[0], context.client) : undefined;
            const guild = channel ? context.client.guilds.cache.get(channel.guild.id) : undefined;
            if (!guild) return [];

            return [...guild.members.cache.values()].map((m) => m.displayName || m.user.username);
        }

        return [];
    },
} satisfies IClCommand;
