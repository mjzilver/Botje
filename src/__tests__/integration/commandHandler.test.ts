import { describe, it, expect, vi } from "vitest";
import { CommandHandler } from "../../handlers/commandHandler";
import { ReplyHandler } from "../../handlers/replyHandler";
import type { ICommand } from "../../interfaces";
import { makeMockContext, TEST_CONFIG, makeMessage } from "@test/helpers";
import { randomBetween } from "../../utils";
import { extractTopics } from "../../features/nlp/topicExtractor";

vi.mock("../../features/nlp/topicExtractor", () => ({
    fetchContextMessages: vi.fn().mockResolvedValue([]),
    extractTopics: vi.fn().mockResolvedValue(["cats"]),
}));

vi.mock("../../utils", async (importOriginal) => {
    const mod = await importOriginal<typeof import("../../utils")>();

    return { ...mod, randomBetween: vi.fn() };
});

function stubCommand(name: string): ICommand {
    return {
        name,
        description: "stub",
        format: name,
        function: vi.fn(),
    } satisfies ICommand;
}

function makeHandler(
    commands: Record<string, ICommand> = {},
    admincommands: Record<string, ICommand> = {},
    dmcommands: Record<string, ICommand> = {},
) {
    const context = makeMockContext({
        loadedCommands: { commands, admincommands, dmcommands, clcommands: {}, disabled: new Set() },
    });
    const replyHandler = new ReplyHandler(context.messageHandler, context.logger, []);

    return {
        handler: new CommandHandler({
            commands: { commands, admincommands, dmcommands, clcommands: {}, disabled: new Set() },
            messageHandler: context.messageHandler,
            replyHandler,
            logger: context.logger,
            config: TEST_CONFIG,
            disallowed: {},
            getBotUser: () => ({ id: "bot-id" }),
            context,
        }),
        context,
    };
}

describe("CommandHandler integration", () => {
    describe("handleCommand — prefix dispatch", () => {
        it("dispatches a known command when prefix matches", () => {
            const ping = stubCommand("ping");
            const { handler } = makeHandler({ ping });

            handler.handleCommand(makeMessage("!ping"));

            expect(ping.function).toHaveBeenCalledOnce();
        });

        it("sends unknown-command reply for unregistered command", () => {
            const { handler, context } = makeHandler();

            handler.handleCommand(makeMessage("!notacommand"));

            expect(context.messageHandler.reply).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining("not a command"),
            );
        });

        it("ignores messages without the prefix", () => {
            const ping = stubCommand("ping");
            const { handler } = makeHandler({ ping });

            handler.handleCommand(makeMessage("ping"));

            expect(ping.function).not.toHaveBeenCalled();
        });

        it("ignores messages from the bot itself", () => {
            const ping = stubCommand("ping");
            const { handler } = makeHandler({ ping });

            handler.handleCommand(makeMessage("!ping", { authorId: "bot-id", isBot: true }));

            expect(ping.function).not.toHaveBeenCalled();
        });
    });

    describe("handleCommand — admin gate", () => {
        it("dispatches admin command when user is administrator", () => {
            const nuke = stubCommand("nuke");
            const { handler } = makeHandler({}, { nuke });

            handler.handleCommand(makeMessage("!nuke", { isAdmin: true }));

            expect(nuke.function).toHaveBeenCalledOnce();
        });

        it("rejects admin command for non-admin user", () => {
            const nuke = stubCommand("nuke");
            const { handler, context } = makeHandler({}, { nuke });

            handler.handleCommand(makeMessage("!nuke", { isAdmin: false }));

            expect(nuke.function).not.toHaveBeenCalled();
            expect(context.messageHandler.reply).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining("admin command"),
            );
        });

        it("allows owner to use admin commands regardless of role", () => {
            const nuke = stubCommand("nuke");
            const { handler } = makeHandler({}, { nuke });

            handler.handleCommand(makeMessage("!nuke", { authorId: TEST_CONFIG.owner, isAdmin: false }));

            expect(nuke.function).toHaveBeenCalledOnce();
        });
    });

    describe("handleDM", () => {
        it("dispatches a known DM command", () => {
            const help = stubCommand("help");
            const { handler } = makeHandler({}, {}, { help });

            handler.handleDM(makeMessage("!help"));

            expect(help.function).toHaveBeenCalledOnce();
        });

        it("replies with help hint for unknown DM command that starts with prefix", () => {
            const { handler, context } = makeHandler();

            handler.handleDM(makeMessage("!unknown"));

            expect(context.messageHandler.reply).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining("help"),
            );
        });

        it("ignores DM messages from bots", () => {
            const help = stubCommand("help");
            const { handler } = makeHandler({}, {}, { help });

            handler.handleDM(makeMessage("!help", { isBot: true }));

            expect(help.function).not.toHaveBeenCalled();
        });
    });

    describe("redo", () => {
        it("re-executes the original command when a reply is found", async () => {
            const ping = stubCommand("ping");
            const { handler, context } = makeHandler({ ping });
            const originalMsg = makeMessage("!ping");
            vi.mocked(context.messageHandler.findFromReply).mockReturnValue("original-msg-id");
            const fetchMessage = vi.fn().mockResolvedValue(originalMsg);

            await handler.redo(makeMessage("redo-msg"), fetchMessage);

            expect(ping.function).toHaveBeenCalledOnce();
            expect(context.messageHandler.delete).toHaveBeenCalledOnce();
        });

        it("does nothing when no original command is found", async () => {
            const ping = stubCommand("ping");
            const { handler, context } = makeHandler({ ping });
            vi.mocked(context.messageHandler.findFromReply).mockReturnValue(undefined);

            await handler.redo(makeMessage("redo-msg"), vi.fn());

            expect(ping.function).not.toHaveBeenCalled();
            expect(context.messageHandler.delete).not.toHaveBeenCalled();
        });
    });

    describe("speakOnContext", () => {
        it("passes a synthetic message with a defined createdAt to the speak command", async () => {
            const receivedMessages: unknown[] = [];
            const speak = stubCommand("speak");
            vi.mocked(speak.function).mockImplementation(async (msg) => {
                receivedMessages.push(msg);
            });
            vi.mocked(randomBetween).mockReturnValueOnce(1).mockReturnValue(0);
            const { handler } = makeHandler({ speak });

            handler.handleNonCommandMessage(makeMessage("hello world"));
            await new Promise<void>((resolve) => setImmediate(resolve));
            await new Promise<void>((resolve) => setImmediate(resolve));

            expect(receivedMessages.length).toBeGreaterThan(0);
            for (const msg of receivedMessages) {
                expect((msg as { createdAt: unknown }).createdAt).toBeInstanceOf(Date);
            }
        });

        it("logs selected auto speak topic", async () => {
            const speak = stubCommand("speak");
            vi.mocked(extractTopics).mockResolvedValueOnce(["cats"]);
            vi.mocked(randomBetween).mockReturnValueOnce(1).mockReturnValue(0);
            const { handler, context } = makeHandler({ speak });

            handler.handleNonCommandMessage(makeMessage("hello world"));
            await new Promise<void>((resolve) => setImmediate(resolve));
            await new Promise<void>((resolve) => setImmediate(resolve));

            expect(context.logger.debug).toHaveBeenCalledWith("Auto speak topic selected: cats");
        });

        it("skips auto speak when no topic is found", async () => {
            const speak = stubCommand("speak");
            vi.mocked(extractTopics).mockResolvedValueOnce([]);
            vi.mocked(randomBetween).mockReturnValueOnce(1).mockReturnValue(0);
            const { handler, context } = makeHandler({ speak });

            handler.handleNonCommandMessage(makeMessage("hello world"));
            await new Promise<void>((resolve) => setImmediate(resolve));
            await new Promise<void>((resolve) => setImmediate(resolve));

            expect(speak.function).not.toHaveBeenCalled();
            expect(context.logger.debug).toHaveBeenCalledWith("Auto speak skipped: no topic found");
        });
    });
});
