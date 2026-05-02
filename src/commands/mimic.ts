import type { ICommand } from "../interfaces";
import { isGuildMessage } from "../interfaces/discord";
import { pickRandomItem, randomBetween, toError } from "../systems/utils";
import { normalizeSpaces } from "../systems/stringHelpers";

type Chain = Record<string, string[]>;

interface StyleProfile {
    prefersLowercase: boolean;
    targetWordCount: number;
    terminator: string;
}

function cleanMessage(raw: string, prefix: string): string | null {
    if (new RegExp(`^${prefix}`, "i").test(raw.trim())) return null;
    const cleaned = normalizeSpaces(
        raw
            .replace(/<[@#!&]?\d+>/g, "")
            .replace(/<:[a-zA-Z0-9_]+:\d+>/g, "")
            .replace(/https?:\/\/\S+/g, "")
            .replace(/www\.\S+/g, ""),
    );
    if (cleaned.split(/\s+/).filter((w) => w.length > 0).length < 3) return null;

    return cleaned;
}

function buildStyleProfile(messages: string[]): StyleProfile {
    let letterStartCount = 0;
    let lowercaseCount = 0;
    let totalWords = 0;
    const terminatorCounts: Record<string, number> = { "": 0, ".": 0, "!": 0, "?": 0, "...": 0 };

    for (const msg of messages) {
        const first = msg.charAt(0);
        if (/[a-zA-Z]/.test(first)) {
            letterStartCount++;
            if (/[a-z]/.test(first)) lowercaseCount++;
        }

        totalWords += msg.split(/\s+/).filter((w) => w.length > 0).length;
        const trimmed = msg.trimEnd();
        if (trimmed.endsWith("...")) terminatorCounts["..."]++;
        else if (trimmed.endsWith("!")) terminatorCounts["!"]++;
        else if (trimmed.endsWith("?")) terminatorCounts["?"]++;
        else if (trimmed.endsWith(".")) terminatorCounts["."]++;
        else terminatorCounts[""]++;
    }

    const prefersLowercase = letterStartCount > 10 && lowercaseCount / letterStartCount > 0.6;
    const avgLen = Math.round(totalWords / messages.length);
    const terminator = Object.entries(terminatorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

    return {
        prefersLowercase,
        targetWordCount: Math.max(5, Math.min(18, avgLen)),
        terminator,
    };
}

function buildChain(messages: string[]): { chain: Chain; starts: [string, string][] } {
    const chain: Chain = {};
    const starts: [string, string][] = [];

    for (const msg of messages) {
        const words = msg
            .trim()
            .split(/\s+/)
            .filter((w) => w.length > 0);
        if (words.length < 3) continue;
        starts.push([words[0], words[1]]);
        for (let i = 0; i < words.length - 2; i++) {
            const key = `${words[i].toLowerCase()} ${words[i + 1].toLowerCase()}`;
            if (!chain[key]) chain[key] = [];
            chain[key].push(words[i + 2]);
        }
    }

    return { chain, starts };
}

function generate(chain: Chain, starts: [string, string][], targetLen: number, style: StyleProfile): string {
    const [w0, w1] = pickRandomItem(starts);
    const words: string[] = [w0, w1];
    let prev = `${w0.toLowerCase()} ${w1.toLowerCase()}`;
    const maxLen = targetLen + randomBetween(0, 4);

    while (words.length < maxLen) {
        const options = chain[prev];
        if (!options || options.length === 0) break;
        const next = pickRandomItem(options);
        words.push(next);
        const last = words.slice(-2);
        prev = `${last[0].toLowerCase()} ${last[1].toLowerCase()}`;
    }

    let result = words.join(" ");
    if (style.prefersLowercase) {
        result = result.toLowerCase();
    } else {
        result = result.charAt(0).toUpperCase() + result.slice(1);
    }

    const lastChar = result.trimEnd().slice(-1);
    if (!/[.!?]/.test(lastChar) && style.terminator) {
        result = result.trimEnd() + style.terminator;
    }

    return normalizeSpaces(result);
}

const MIN_MESSAGES = 50;

export default {
    name: "mimic",
    description: "generates a message that sounds like the mentioned user based on their message history",
    format: "mimic @user",
    options: [{ type: "user", name: "user", description: "The user whose style to mimic", required: true }],
    async function(message, context) {
        if (!isGuildMessage(message)) {
            context.messageHandler.reply(message, "This command can only be used in a server.");

            return;
        }

        const target = message.mentions.users.first();
        if (!target) {
            context.messageHandler.reply(message, "Usage: `!mimic @user`");

            return;
        }

        if (target.id === context.client.user?.id) {
            context.messageHandler.reply(message, "I refuse to mimic myself.");

            return;
        }

        try {
            const rows = await context.database.query<{ message: string }>(
                `SELECT message FROM messages
                 WHERE user_id = $1 AND server_id = $2
                 AND LENGTH(message) > 5
                 ORDER BY RANDOM()
                 LIMIT 5000`,
                [target.id, message.guild.id],
            );

            const cleaned = rows
                .map((r) => cleanMessage(r.message, context.config.prefix))
                .filter((m): m is string => m !== null);

            if (cleaned.length < MIN_MESSAGES) {
                const displayName = await context.userHandler.getDisplayName(target.id, message.guild.id);
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

            const generated = generate(chain, starts, style.targetWordCount, style);

            context.messageHandler.send(message, generated);
        } catch (err) {
            context.logger.error(toError(err));
        }
    },
} satisfies ICommand;
