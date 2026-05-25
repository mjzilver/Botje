import type { IMessageHandler, ILogger } from "../interfaces";
import type { BotMessage } from "../interfaces/discord";
import { pickRandomItem } from "./utils";
import { CooldownTracker } from "./cooldownTracker";

interface ReplyPattern {
    name: string;
    regex: string;
    replies: string[];
    reply: boolean;
    mention: boolean;
    timeout: number;
}

function normalizeForMatching(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export class ReplyHandler {
    private replyPatterns: ReplyPattern[];
    private compiledPatterns: Map<string, RegExp>;
    private messageHandler: IMessageHandler;
    private logger: ILogger;
    private cooldown = new CooldownTracker();
    constructor(messageHandler: IMessageHandler, logger: ILogger, patterns: ReplyPattern[]) {
        this.messageHandler = messageHandler;
        this.logger = logger;
        this.replyPatterns = patterns;
        this.compiledPatterns = new Map(patterns.map((p) => [p.name, new RegExp(p.regex, "gi")]));
    }

    process(message: BotMessage): boolean {
        let matched = false;
        const normalized = normalizeForMatching(message.content);
        for (const pattern of this.replyPatterns) {
            const regex = this.compiledPatterns.get(pattern.name)!;
            if (normalized.match(regex) && this.cooldown.isAllowed(pattern.name, pattern.timeout * 60 * 1000)) {
                this.logger.debug(`Replying to '${message.content}' matching pattern '${pattern.name}'`);
                const text = pickRandomItem(pattern.replies) + (pattern.mention ? `, ${message.author.username}` : "");
                if (pattern.reply) this.messageHandler.reply(message, text);
                else this.messageHandler.send(message, text);
                matched = true;
            }
        }

        return matched;
    }
}
