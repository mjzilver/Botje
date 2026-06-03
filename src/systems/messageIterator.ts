import type { ILogger } from "../interfaces";
import { toError } from "./utils";

export interface IterableMessage {
    id: string;
    author?: {
        id: string;
        bot?: boolean;
    };
    webhookId?: string | null;
    content?: string;
    delete(): Promise<IterableMessage>;
}

interface FetchableChannel {
    name?: string | null;
    lastMessageId?: string | null;
    messages: {
        fetch(options: { limit: number; before: string }): Promise<Map<string, IterableMessage>>;
    };
    guild?: {
        name?: string | null;
    };
}

export interface IteratorStats {
    totalProcessed: number;
}

export interface IteratorOptions {
    onMessage?(message: IterableMessage): Promise<void> | void;
    onComplete?(stats: IteratorStats): void;
    limit?: number;
    logProgress?: boolean;
}

export class MessageIterator {
    private onMessage: (message: IterableMessage) => Promise<void> | void;
    private onComplete: ((stats: IteratorStats) => void) | null;
    private limit: number;
    private logProgress: boolean;
    private logger: ILogger;
    private stats: IteratorStats = { totalProcessed: 0 };
    constructor(logger: ILogger, options: IteratorOptions = {}) {
        this.logger = logger;
        this.onMessage = options.onMessage ?? (() => {});
        this.onComplete = options.onComplete ?? null;
        this.limit = options.limit ?? Infinity;
        this.logProgress = options.logProgress !== false;
    }

    async iterate(channel: FetchableChannel, startMessageId?: string | null): Promise<void> {
        const messageId = startMessageId ?? channel.lastMessageId;
        if (!messageId) {
            if (this.logProgress) this.logger.console(`No messages found in ${channel.name ?? "channel"}`);
            this.onComplete?.(this.stats);

            return;
        }

        await this.fetchBatch(channel, messageId);
    }

    private async fetchBatch(channel: FetchableChannel, messageId: string): Promise<void> {
        const remaining = this.limit - this.stats.totalProcessed;
        if (remaining <= 0) {
            if (this.logProgress)
                this.logger.console(`Limit reached: ${this.stats.totalProcessed} messages from ${channel.name}`);
            this.onComplete?.(this.stats);

            return;
        }

        const fetchLimit = Math.min(100, remaining);
        try {
            const messages = await channel.messages.fetch({ limit: fetchLimit, before: messageId });
            if (messages.size === 0) {
                if (this.logProgress)
                    this.logger.console(`End reached: ${this.stats.totalProcessed} messages from ${channel.name}`);
                this.onComplete?.(this.stats);

                return;
            }

            let lastId = messageId;
            for (const [id, message] of messages) {
                await this.onMessage(message);
                lastId = id;
                this.stats.totalProcessed++;
            }

            if (this.logProgress && messages.size === 100)
                this.logger.console(
                    `${this.stats.totalProcessed} messages from ${channel.name} in ${channel.guild?.name ?? "DM"}`,
                );
            if (messages.size === 100 && this.stats.totalProcessed < this.limit) await this.fetchBatch(channel, lastId);
            else {
                if (this.logProgress)
                    this.logger.console(`Done: ${this.stats.totalProcessed} messages from ${channel.name}`);
                this.onComplete?.(this.stats);
            }
        } catch (err) {
            this.logger.error(`Error fetching from ${channel.name}: ${toError(err).message}`);
            this.onComplete?.(this.stats);
        }
    }
}
