import { describe, it, expect, vi } from "vitest";
import { EmbedBuilder } from "discord.js";
import { Pagination } from "../../systems/pagination";
import type { IMessageHandler } from "../../interfaces";
import type { MessageContent } from "../../interfaces/discord";
import { makeMessage } from "../helpers/mockMessage";

function makeMessageHandler(sentMessages: MessageContent[] = []): IMessageHandler {
    return {
        send: vi.fn().mockImplementation((_msg, content) => {
            sentMessages.push(content);

            return Promise.resolve({
                createMessageComponentCollector: () => ({
                    on: vi.fn(),
                }),
            });
        }),
        reply: vi.fn().mockResolvedValue(undefined),
        edit: vi.fn().mockResolvedValue(undefined),
        markComplete: vi.fn(),
        setCommandListRemover: vi.fn(),
        loadCommandCalls: vi.fn().mockResolvedValue(undefined),
    } as unknown as IMessageHandler;
}

describe("Pagination.createPages", () => {
    it("creates one page when items fit within itemsPerPage", async () => {
        const pagination = new Pagination(makeMessageHandler());
        const items = [1, 2, 3];
        const pages = await pagination.createPages(items, 10, (slice) =>
            new EmbedBuilder().setDescription(slice.join(",")),
        );
        expect(pages).toHaveLength(1);
        expect(pages[0]).toBeInstanceOf(EmbedBuilder);
    });

    it("creates multiple pages when items exceed itemsPerPage", async () => {
        const pagination = new Pagination(makeMessageHandler());
        const items = Array.from({ length: 25 }, (_, i) => i);
        const pages = await pagination.createPages(items, 10, (slice) =>
            new EmbedBuilder().setDescription(slice.join(",")),
        );
        expect(pages).toHaveLength(3);
    });

    it("passes correct pageNum and totalPages to formatter", async () => {
        const pagination = new Pagination(makeMessageHandler());
        const received: Array<{ pageNum: number; totalPages: number }> = [];
        await pagination.createPages([1, 2, 3, 4, 5], 2, (_slice, pageNum, totalPages) => {
            received.push({ pageNum, totalPages });

            return new EmbedBuilder();
        });
        expect(received).toEqual([
            { pageNum: 1, totalPages: 3 },
            { pageNum: 2, totalPages: 3 },
            { pageNum: 3, totalPages: 3 },
        ]);
    });

    it("passes the correct slice to each page", async () => {
        const pagination = new Pagination(makeMessageHandler());
        const slices: number[][] = [];
        await pagination.createPages([10, 20, 30, 40, 50], 2, (slice) => {
            slices.push(slice);

            return new EmbedBuilder();
        });
        expect(slices).toEqual([[10, 20], [30, 40], [50]]);
    });
});

describe("Pagination.sendPaginatedEmbed – single page", () => {
    it("sends the page directly without navigation buttons", async () => {
        const sent: MessageContent[] = [];
        const pagination = new Pagination(makeMessageHandler(sent));
        const embed = new EmbedBuilder().setTitle("Hello");
        await pagination.sendPaginatedEmbed(makeMessage("!test"), [embed]);
        expect(sent).toHaveLength(1);
        expect(sent[0]).toBeInstanceOf(EmbedBuilder);
    });
});

describe("Pagination.sendPaginatedEmbed – multiple pages", () => {
    it("wraps EmbedBuilder pages with navigation components", async () => {
        const sent: MessageContent[] = [];
        const pagination = new Pagination(makeMessageHandler(sent));
        const pages = [new EmbedBuilder().setTitle("Page 1"), new EmbedBuilder().setTitle("Page 2")];
        await pagination.sendPaginatedEmbed(makeMessage("!test"), pages);
        expect(sent).toHaveLength(1);
        const content = sent[0] as { embeds?: EmbedBuilder[]; components?: unknown[] };
        expect(content.embeds).toHaveLength(1);
        expect(content.components).toHaveLength(1);
    });

    it("throws when pages array is empty", async () => {
        const pagination = new Pagination(makeMessageHandler());
        await expect(pagination.sendPaginatedEmbed(makeMessage("!test"), [])).rejects.toThrow("Pages array cannot be empty");
    });

    it("preserves string pages by wrapping with content property", async () => {
        const sent: MessageContent[] = [];
        const pagination = new Pagination(makeMessageHandler(sent));
        await pagination.sendPaginatedEmbed(makeMessage("!test"), ["page one", "page two"]);
        const content = sent[0] as { content?: string; components?: unknown[] };
        expect(content.content).toBe("page one");
        expect(content.components).toBeDefined();
    });
});
