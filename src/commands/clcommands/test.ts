import type { IClCommand, ICommand, IBotContext, CommandOption } from "../../interfaces";
import type { BotGuildTextChannel } from "../../interfaces/discord";
import { getTextChannels, cliToMessage } from "../../systems/messageAdapter";
import { toError } from "../../systems/utils";

const CALL_DELAY_MS = 800;
const SKIP_COMMANDS = new Set(["ask", "tarot"]);

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function findChannel(input: string, context: IBotContext): BotGuildTextChannel | undefined {
    const channels = getTextChannels(context.client);

    return (
        channels.find((ch) => ch.id === input) ?? channels.find((ch) => ch.name.toLowerCase() === input.toLowerCase())
    );
}

const STRING_VALUES: Record<string, string> = {
    subreddit: "aww",
    city: "Leiden",
    keyword: "cats",
    question: "what is the meaning of life",
};

function generateValue(opt: CommandOption): string {
    if (opt.choices && opt.choices.length > 0) return opt.choices[0].value;
    if (opt.type === "integer") return "5";

    return STRING_VALUES[opt.name] ?? "test";
}

function buildCalls(command: ICommand): string[][] {
    if (command.subcommands && command.subcommands.length > 0) {
        return command.subcommands.map((sub) => {
            const call = [command.name, sub.name];
            for (const opt of sub.options ?? []) {
                if (opt.type !== "user" && opt.required) call.push(generateValue(opt));
            }

            return call;
        });
    }

    const nonUserOpts = (command.options ?? []).filter((o) => o.type !== "user");
    const allArgs = nonUserOpts.map(generateValue);
    const requiredArgs = nonUserOpts.filter((o) => o.required).map(generateValue);

    const calls: string[][] = [];
    if (allArgs.length === 0) {
        calls.push([command.name]);
    } else if (requiredArgs.length === 0) {
        calls.push([command.name]);
        calls.push([command.name, ...allArgs]);
    } else if (allArgs.length === requiredArgs.length) {
        calls.push([command.name, ...requiredArgs]);
    } else {
        calls.push([command.name, ...requiredArgs]);
        calls.push([command.name, ...allArgs]);
    }

    if (/\btop\b/.test(command.format)) calls.push([command.name, "top"]);
    if (/\bpercent\b/.test(command.format)) calls.push([command.name, "percent"]);

    return calls;
}

export default {
    name: "test",
    description: "runs all regular commands in a channel as an e2e smoke test (excludes admin commands)",
    format: "test <channel>",
    async function(input: string[], context: IBotContext) {
        const [channelInput] = input;
        if (!channelInput) {
            context.logger.console("Usage: test <channel>");

            return;
        }

        const channel = findChannel(channelInput, context);
        if (!channel) {
            context.logger.console(`Channel not found: ${channelInput}`);

            return;
        }

        const commands = Object.values(context.loadedCommands.commands);
        let total = 0;
        let succeeded = 0;

        context.logger.console(`Running ${commands.length} commands in #${channel.name}...`);

        for (const command of commands) {
            if (SKIP_COMMANDS.has(command.name)) {
                context.logger.console(`  skip  ${command.name}`);
                continue;
            }

            const calls = buildCalls(command);
            for (const callArgs of calls) {
                const content = callArgs.join(" ");
                const message = cliToMessage(channel, context.client, content);
                if (!message) continue;

                total++;
                try {
                    await command.function(message, context);
                    succeeded++;
                    context.logger.console(`  ok  ${content}`);
                } catch (err) {
                    context.logger.console(`  fail  ${content}: ${toError(err).message}`);
                }

                await delay(CALL_DELAY_MS);
            }
        }

        context.logger.console(`Done: ${succeeded}/${total} invocations succeeded`);
    },
    completer(argIndex: number, context: IBotContext, _input: string[]): string[] {
        if (argIndex === 0) return getTextChannels(context.client).map((ch) => ch.name);

        return [];
    },
} satisfies IClCommand;
