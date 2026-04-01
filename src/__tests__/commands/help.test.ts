import { describe, it, expect, vi } from "vitest";
import { EmbedBuilder } from "discord.js";
import helpCommand from "../../commands/help";
import type { IBotContext } from "../../interfaces";
import type { ICommand } from "../../interfaces";
import type { BotMessage, MessageContent } from "../../interfaces/discord";

function makeCommand(name: string): ICommand {
    return {
        name,
        description: `${name} description`,
        format: name,
        function: vi.fn(),
    };
}

function makeContext(commands: Record<string, ICommand>): IBotContext {
    const pages: MessageContent[] = [];
    return {
        loadedCommands: {
            commands,
            admincommands: {},
            dmcommands: {},
            clcommands: {},
        },
        config: { color_hex: "#ffffff" } as unknown as IBotContext["config"],
        pagination: {
            createPages: vi
                .fn()
                .mockImplementation(
                    async <T>(
                        items: T[],
                        _perPage: number,
                        formatter: (items: T[], p: number, total: number) => MessageContent,
                    ) => {
                        return [formatter(items, 1, 1)];
                    },
                ),
            sendPaginatedEmbed: vi.fn().mockResolvedValue(undefined),
        },
        messageHandler: {
            send: vi.fn(),
            reply: vi.fn(),
            edit: vi.fn(),
            markComplete: vi.fn(),
            setCommandListRemover: vi.fn(),
            loadCommandCalls: vi.fn(),
        } as unknown as IBotContext["messageHandler"],
        logger: {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
            console: vi.fn(),
            startup: vi.fn(),
            printColumns: vi.fn(),
        } as unknown as IBotContext["logger"],
        database: {} as IBotContext["database"],
        userHandler: {} as IBotContext["userHandler"],
        backupHandler: {} as IBotContext["backupHandler"],
        hangman: {} as IBotContext["hangman"],
        llm: {} as IBotContext["llm"],
        dictionary: {} as IBotContext["dictionary"],
        client: { user: null, readyTimestamp: null, channels: { cache: new Map() }, destroy: vi.fn() },
        disallowed: {},
    };
}

function makeMessage(): BotMessage {
    return {
        author: { id: "u1", username: "tester", bot: false },
        content: "!help",
        channel: { id: "ch1", name: "general", messages: { fetch: vi.fn() } },
    } as unknown as BotMessage;
}

describe("help command – metadata", () => {
    it("has name 'help'", () => {
        expect(helpCommand.name).toBe("help");
    });

    it("has a format and description", () => {
        expect(typeof helpCommand.format).toBe("string");
        expect(typeof helpCommand.description).toBe("string");
    });
});

describe("help command – execution", () => {
    it("calls createPages with all loaded commands", async () => {
        const commands = {
            ping: makeCommand("ping"),
            roll: makeCommand("roll"),
            speak: makeCommand("speak"),
        };
        const context = makeContext(commands);
        await helpCommand.function(makeMessage(), context);

        expect(context.pagination.createPages).toHaveBeenCalledOnce();
        const items = (context.pagination.createPages as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(items).toHaveLength(3);
        expect(items.map((c: ICommand) => c.name)).toEqual(expect.arrayContaining(["ping", "roll", "speak"]));
    });

    it("calls sendPaginatedEmbed with the created pages", async () => {
        const context = makeContext({ ping: makeCommand("ping") });
        await helpCommand.function(makeMessage(), context);

        expect(context.pagination.sendPaginatedEmbed).toHaveBeenCalledOnce();
    });

    it("page formatter returns an EmbedBuilder", async () => {
        let capturedFormatter: ((items: ICommand[], p: number, total: number) => MessageContent) | null = null;
        const context = makeContext({ ping: makeCommand("ping") });
        (context.pagination.createPages as ReturnType<typeof vi.fn>).mockImplementation(
            async <T>(
                items: T[],
                _perPage: number,
                formatter: (items: T[], p: number, total: number) => MessageContent,
            ) => {
                capturedFormatter = formatter as typeof capturedFormatter;
                return [formatter(items, 1, 1)];
            },
        );

        await helpCommand.function(makeMessage(), context);

        expect(capturedFormatter).not.toBeNull();
        const result = capturedFormatter!([makeCommand("ping")], 1, 2);
        expect(result).toBeInstanceOf(EmbedBuilder);
    });

    it("page formatter includes command format in description", async () => {
        let capturedFormatter: ((items: ICommand[], p: number, total: number) => MessageContent) | null = null;
        const context = makeContext({ roll: makeCommand("roll") });
        (context.pagination.createPages as ReturnType<typeof vi.fn>).mockImplementation(
            async <T>(
                items: T[],
                _perPage: number,
                formatter: (items: T[], p: number, total: number) => MessageContent,
            ) => {
                capturedFormatter = formatter as typeof capturedFormatter;
                return [formatter(items, 1, 1)];
            },
        );

        await helpCommand.function(makeMessage(), context);

        const result = capturedFormatter!([makeCommand("roll")], 1, 1) as EmbedBuilder;
        const data = result.toJSON();
        expect(data.description).toContain("roll");
    });
});
