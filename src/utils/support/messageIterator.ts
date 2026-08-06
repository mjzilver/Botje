import type { ILogger } from "../../interfaces";
import { toError } from "../utils";

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
            this.complete(`No messages found in ${channel.name ?? "channel"}`);

            return;
        }

        await this.fetchBatch(channel, messageId);
    }

    private complete(logLine?: string): void {
        if (this.logProgress && logLine) {
            this.logger.console(logLine);
        }

        this.onComplete?.(this.stats);
    }

    private shouldContinue(messages: Map<string, IterableMessage>): boolean {
        return messages.size === 100 && this.stats.totalProcessed < this.limit;
    }

    private async processMessages(
        messages: Map<string, IterableMessage>,
        initialMessageId: string,
    ): Promise<{ lastId: string; size: number }> {
        let lastId = initialMessageId;
        for (const [id, message] of messages) {
            await this.onMessage(message);
            lastId = id;
            this.stats.totalProcessed++;
        }

        return { lastId, size: messages.size };
    }

    private logBatchProgress(channel: FetchableChannel, size: number): void {
        if (this.logProgress && size === 100) {
            this.logger.console(
                `${this.stats.totalProcessed} messages from ${channel.name} in ${channel.guild?.name ?? "DM"}`,
            );
        }
    }

    private async fetchBatch(channel: FetchableChannel, messageId: string): Promise<void> {
        const remaining = this.limit - this.stats.totalProcessed;
        if (remaining <= 0) {
            this.complete(`Limit reached: ${this.stats.totalProcessed} messages from ${channel.name}`);

            return;
        }

        const fetchLimit = Math.min(100, remaining);
        let messages: Map<string, IterableMessage>;
        try {
            messages = await channel.messages.fetch({ limit: fetchLimit, before: messageId });
        } catch (err) {
            this.logger.error(`Error fetching from ${channel.name}: ${toError(err).message}`);
            this.complete();

            return;
        }

        if (messages.size === 0) {
            this.complete(`End reached: ${this.stats.totalProcessed} messages from ${channel.name}`);

            return;
        }

        const { lastId, size } = await this.processMessages(messages, messageId);
        this.logBatchProgress(channel, size);

        if (this.shouldContinue(messages)) {
            await this.fetchBatch(channel, lastId);

            return;
        }

        this.complete(`Done: ${this.stats.totalProcessed} messages from ${channel.name}`);
    }
}
