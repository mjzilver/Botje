import type { IClCommand, IBotContext } from "../../interfaces";
import { findChannel, getTextChannels, cliToMessage } from "../../systems/messageAdapter";

export default {
    name: "run",
    description: "runs a discord command in a channel as the bot",
    format: "run <channel> <command> [args...]",
    async function(input: string[], context: IBotContext) {
        const [channelInput, commandName, ...args] = input;
        if (!channelInput || !commandName) {
            context.logger.console("Usage: run <channel> <command> [args...]");

            return;
        }

        const channel = findChannel(channelInput, context.client);
        if (!channel) {
            context.logger.console(`Channel not found: ${channelInput}`);

            return;
        }

        const allCommands = { ...context.loadedCommands.commands, ...context.loadedCommands.admincommands };
        const command = allCommands[commandName.toLowerCase()];
        if (!command) {
            context.logger.console(
                `Command not found: ${commandName}. Available: ${Object.keys(allCommands).join(", ")}`,
            );

            return;
        }

        const content = args.join(" ");
        const message = cliToMessage(channel, context.client, content);
        if (!message) {
            context.logger.console("Bot user not available yet");

            return;
        }

        await command.function(message, context);
    },
    completer(argIndex: number, context: IBotContext, _input: string[]): string[] {
        if (argIndex === 0) return getTextChannels(context.client).map((ch) => ch.name);
        if (argIndex === 1) {
            return [
                ...Object.keys(context.loadedCommands.commands),
                ...Object.keys(context.loadedCommands.admincommands),
            ];
        }

        return [];
    },
} satisfies IClCommand;
