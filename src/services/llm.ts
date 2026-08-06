import type { IMessageHandler } from "../handlers/messageHandler";
import type { ILogger } from "../infrastructure/logger";
import type { LlmConfig } from "../interfaces/config";
import type { BotMessage } from "../interfaces/discord";
import { toError } from "../utils";

export interface ILlmService {
    streamToMessage(
        placeholder: BotMessage,
        prompt: string,
        filterFn?: ((text: string) => string) | null,
    ): Promise<string | null>;
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
            if (this.activeRequests < this.config.maxConcurrentRequests) {
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
            const next = this.requestQueue.shift();
            next?.();
        }
    }

    private async createStreamReader(
        prompt: string,
        controller: AbortController,
    ): Promise<ReadableStreamDefaultReader<Uint8Array> | null> {
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

        return response.body?.getReader() ?? null;
    }

    private parseLines(decoder: TextDecoder, value: Uint8Array): string[] {
        const chunk = decoder.decode(value, { stream: true }).trim();
        if (!chunk) {
            return [];
        }

        return chunk.split("\n");
    }

    private isLlmError(err: unknown): boolean {
        return toError(err).message?.includes("LLM error") ?? false;
    }

    private applyFilter(
        nextResponse: string,
        accumulated: string,
        firstChunk: boolean,
        filterFn: ((text: string) => string) | null,
    ): string {
        if (!filterFn) {
            return accumulated;
        }

        return filterFn(firstChunk ? nextResponse : accumulated);
    }

    private async renderUpdate(
        placeholder: BotMessage,
        toDisplay: string,
        controller: AbortController,
    ): Promise<boolean> {
        try {
            await this.messageHandler.edit(placeholder, toDisplay);

            return true;
        } catch {
            this.logger.debug("Message edit failed (likely deleted), aborting stream");
            controller.abort();

            return false;
        }
    }

    private async consumeStream(
        reader: ReadableStreamDefaultReader<Uint8Array>,
        placeholder: BotMessage,
        filterFn: ((text: string) => string) | null,
        controller: AbortController,
    ): Promise<string> {
        const decoder = new TextDecoder("utf-8");
        let accumulated = "";
        let firstChunk = true;
        let shouldAbort = false;

        while (!shouldAbort) {
            const { done, value } = await reader.read();
            if (done || !value) {
                break;
            }

            const lines = this.parseLines(decoder, value);
            for (const line of lines) {
                if (shouldAbort) {
                    break;
                }
                const result = await this.handleResponseLine(
                    line,
                    accumulated,
                    firstChunk,
                    filterFn,
                    placeholder,
                    controller,
                );
                accumulated = result.accumulated;
                firstChunk = result.firstChunk;
                shouldAbort = result.shouldAbort;
            }
        }

        return accumulated;
    }

    private async handleResponseLine(
        line: string,
        accumulated: string,
        firstChunk: boolean,
        filterFn: ((text: string) => string) | null,
        placeholder: BotMessage,
        controller: AbortController,
    ): Promise<{ accumulated: string; firstChunk: boolean; shouldAbort: boolean }> {
        try {
            const json = JSON.parse(line) as {
                error?: string;
                response?: string;
            };
            if (json.error) {
                this.logger.error(`LLM error: ${json.error}`);
                throw new Error(json.error);
            }
            if (!json.response) {
                return { accumulated, firstChunk, shouldAbort: false };
            }

            const nextAccumulated = accumulated + json.response;
            const toDisplay = this.applyFilter(json.response, nextAccumulated, firstChunk, filterFn);
            const didRender = await this.renderUpdate(placeholder, toDisplay, controller);
            if (!didRender) {
                return { accumulated: nextAccumulated, firstChunk, shouldAbort: true };
            }

            return { accumulated: nextAccumulated, firstChunk: false, shouldAbort: false };
        } catch (err) {
            if (this.isLlmError(err)) {
                throw err;
            }

            this.logger.warn(`Skipping invalid JSON line: ${line}`);

            return { accumulated, firstChunk, shouldAbort: false };
        }
    }

    async streamToMessage(
        placeholder: BotMessage,
        prompt: string,
        filterFn: ((text: string) => string) | null = null,
    ): Promise<string | null> {
        await this.acquireSlot();
        const controller = new AbortController();
        try {
            const reader = await this.createStreamReader(prompt, controller);
            if (!reader) {
                return null;
            }

            const accumulated = await this.consumeStream(reader, placeholder, filterFn, controller);

            return accumulated || null;
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

        return null;
    }
}
