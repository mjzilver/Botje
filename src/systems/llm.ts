import type { LlmConfig } from "../interfaces/config";
import { toError } from "./utils";
import type { BotMessage } from "../interfaces/discord";
import type { IMessageHandler } from "./messageHandler";
import type { ILogger } from "./logger";

export interface ILlmService {
    streamToMessage(
        placeholder: BotMessage,
        prompt: string,
        filterFn?: ((text: string) => string) | null,
    ): Promise<string | undefined>;
}

export class LlmService {
    private config: LlmConfig;
    private logger: ILogger;
    private messageHandler: IMessageHandler;
    private activeRequests = 0;
    private requestQueue: Array<() => void> = [];
    constructor(config: LlmConfig, logger: ILogger, messageHandler: IMessageHandler) {
        this.config = config;
        this.logger = logger;
        this.messageHandler = messageHandler;
    }

    private acquireSlot(): Promise<void> {
        return new Promise((resolve) => {
            if (this.activeRequests < this.config.max_concurrent_requests) {
                this.activeRequests++;
                resolve();
            } else {
                this.logger.debug(`LLM request queued. Queue length: ${this.requestQueue.length}`);
                this.requestQueue.push(resolve);
            }
        });
    }

    private releaseSlot(): void {
        this.activeRequests--;
        if (this.requestQueue.length > 0) {
            this.activeRequests++;
            const next = this.requestQueue.shift()!;
            next();
        }
    }

    async streamToMessage(
        placeholder: BotMessage,
        prompt: string,
        filterFn: ((text: string) => string) | null = null,
    ): Promise<string | undefined> {
        await this.acquireSlot();
        const controller = new AbortController();
        try {
            const response = await fetch(this.config.api, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: this.config.model,
                    prompt,
                    stream: true,
                }),
                signal: controller.signal,
            });
            const reader = (response.body as ReadableStream<Uint8Array>).getReader();
            const decoder = new TextDecoder("utf-8");
            let accumulated = "";
            let firstChunk = true;
            let shouldAbort = false;
            while (!shouldAbort) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true }).trim();
                if (!chunk) continue;
                for (const line of chunk.split("\n")) {
                    if (shouldAbort) break;
                    try {
                        const json = JSON.parse(line) as {
                            response?: string;
                            error?: string;
                        };
                        if (json.error) {
                            this.logger.error(`LLM error: ${json.error}`);
                            throw new Error(json.error);
                        }
                        if (json.response) {
                            accumulated += json.response;
                            const toDisplay = filterFn
                                ? filterFn(firstChunk ? json.response : accumulated)
                                : accumulated;
                            try {
                                await this.messageHandler.edit(placeholder, toDisplay);
                                firstChunk = false;
                            } catch {
                                this.logger.debug("Message edit failed (likely deleted), aborting stream");
                                controller.abort();
                                shouldAbort = true;
                            }
                        }
                    } catch (err) {
                        if (toError(err).message?.includes("LLM error")) throw err;
                        this.logger.warn(`Skipping invalid JSON line: ${line}`);
                    }
                }
            }

            return accumulated;
        } catch (err) {
            if (toError(err).name === "AbortError") {
                this.logger.info("LLM stream aborted.");
            } else {
                this.logger.error(toError(err));
                throw err;
            }
        } finally {
            this.releaseSlot();
        }
    }
}
