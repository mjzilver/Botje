import type { ICommand } from "../interfaces";
import { toError } from "../systems/utils";
import { getBotContext } from "../systems/botContext";

const MAX_DURATION_MS = 24 * 60 * 60 * 1000;

function parseDuration(input: string): number | null {
    const match = /^(\d+)(s|m|h)$/.exec(input.toLowerCase());

    if (!match) return null;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    if (unit === "s") return value * 1000;
    if (unit === "m") return value * 60 * 1000;

    return value * 60 * 60 * 1000;
}

function formatDuration(ms: number): string {
    if (ms < 60_000) return `${Math.round(ms / 1000)} second(s)`;
    if (ms < 3_600_000) return `${Math.round(ms / 60_000)} minute(s)`;

    return `${Math.round(ms / 3_600_000)} hour(s)`;
}

export default {
    name: "remind",
    description: "schedules a reminder (e.g. 30m, 2h, 90s — max 24h)",
    format: "remind <duration> <message>",
    async function(message) {
        const context = getBotContext();
        const args = message.content.split(/\s+/).slice(1);

        if (args.length < 2) {
            context.messageHandler.reply(
                message,
                "Usage: `!remind <duration> <message>` — e.g. `!remind 30m feed the cat`",
            );

            return;
        }

        const delayMs = parseDuration(args[0]);

        if (delayMs === null) {
            context.messageHandler.reply(
                message,
                "Invalid duration. Use a number followed by `s`, `m`, or `h` (e.g. `30m`, `2h`, `90s`).",
            );

            return;
        }

        if (delayMs > MAX_DURATION_MS) {
            context.messageHandler.reply(message, "Maximum reminder duration is 24 hours.");

            return;
        }

        if (delayMs <= 0) {
            context.messageHandler.reply(message, "Duration must be greater than zero.");

            return;
        }

        const reminderMessage = args.slice(1).join(" ");

        try {
            await context.reminderScheduler.schedule(message.author.id, message.channel.id, reminderMessage, delayMs);

            context.messageHandler.reply(
                message,
                `Got it! I'll remind you in **${formatDuration(delayMs)}** about: *${reminderMessage}*`,
            );
        } catch (err) {
            context.logger.error(toError(err));
            context.messageHandler.reply(message, "Failed to set reminder. Please try again.");
        }
    },
} satisfies ICommand;
