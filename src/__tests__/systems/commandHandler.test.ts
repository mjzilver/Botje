import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mockDeep } from "vitest-mock-extended";

import { CommandHandler } from "../../systems/commandHandler";
import type { IMessageHandler, ILogger, ICommand, IBotContext } from "../../interfaces";
import type { BotConfig } from "../../interfaces/config";
import type { ReplyHandler } from "../../systems/replyHandler";
import type { LoadedCommands } from "../../systems/commandLoader";
import { makeCommand } from "../helpers/mockContext";
import { makeMessage } from "../helpers/mockMessage";

const config = {
    prefix: "!",
    owner: "owner-id",
    timeoutDuration: 5,
    speakEvery: 10,
} as unknown as BotConfig;

function makeHandler(opts?: {
    commands?: Record<string, ICommand>;
    admincommands?: Record<string, ICommand>;
    dmcommands?: Record<string, ICommand>;
    disallowed?: Record<string, boolean>;
    mh?: IMessageHandler;
    replyHandler?: ReplyHandler;
    getBotUser?: () => { id: string } | null;
}): { handler: CommandHandler; mh: IMessageHandler } {
    const mh = opts?.mh ?? mockDeep<IMessageHandler>();
    const context = { messageHandler: mh } as unknown as IBotContext;
    const commands: LoadedCommands = {
        commands: opts?.commands ?? {},
        admincommands: opts?.admincommands ?? {},
        dmcommands: opts?.dmcommands ?? {},
        clcommands: {},
    };
    const handler = new CommandHandler({
        commands,
        messageHandler: mh,
        replyHandler: opts?.replyHandler ?? mockDeep<ReplyHandler>(),
        logger: mockDeep<ILogger>(),
        config,
        disallowed: opts?.disallowed ?? {},
        getBotUser: opts?.getBotUser ?? (() => ({ id: "bot-id" })),
        context,
    });

    return { handler, mh };
}

describe("CommandHandler", () => {
    describe("handleCommand", () => {
        it("ignores messages authored by the bot itself", () => {
            const { handler, mh } = makeHandler({ getBotUser: () => ({ id: "bot-id" }) });

            handler.handleCommand(makeMessage("!test", { authorId: "bot-id" }));

            expect(mh.reply).not.toHaveBeenCalled();
            expect(mh.send).not.toHaveBeenCalled();
        });

        it("dispatches a known command to its handler function", () => {
            const cmd = makeCommand();
            const { handler } = makeHandler({ commands: { test: cmd } });

            handler.handleCommand(makeMessage("!test"));

            expect(cmd.function).toHaveBeenCalledOnce();
        });

        it("replies 'not a command' for unrecognised commands", () => {
            const { handler, mh } = makeHandler();

            handler.handleCommand(makeMessage("!unknown"));

            expect(mh.reply).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("not a command"));
        });

        it("marks complete for unknown commands in readback mode", () => {
            const { handler, mh } = makeHandler();

            handler.handleCommand(makeMessage("!unknown"), true);

            expect(mh.markComplete).toHaveBeenCalledOnce();
        });

        it("refuses admin commands for non-admin non-owner users", () => {
            const adminCmd = makeCommand();
            const { handler, mh } = makeHandler({ admincommands: { nuke: adminCmd } });

            handler.handleCommand(makeMessage("!nuke", { isAdmin: false }));

            expect(adminCmd.function).not.toHaveBeenCalled();
            expect(mh.reply).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("admin command"));
        });

        it("runs admin commands for admin users", () => {
            const adminCmd = makeCommand();
            const { handler } = makeHandler({ admincommands: { nuke: adminCmd } });

            handler.handleCommand(makeMessage("!nuke", { isAdmin: true }));

            expect(adminCmd.function).toHaveBeenCalledOnce();
        });

        it("runs admin commands for the configured owner", () => {
            const adminCmd = makeCommand();
            const { handler } = makeHandler({ admincommands: { nuke: adminCmd } });

            handler.handleCommand(makeMessage("!nuke", { authorId: "owner-id" }));

            expect(adminCmd.function).toHaveBeenCalledOnce();
        });

        it("blocks banned users from running commands", () => {
            const cmd = makeCommand();
            const { handler } = makeHandler({
                commands: { test: cmd },
                disallowed: { "banned-id": true },
            });

            handler.handleCommand(makeMessage("!test", { authorId: "banned-id" }));

            expect(cmd.function).not.toHaveBeenCalled();
        });

        it("does not reply to non-command messages from other bots", () => {
            const { handler, mh } = makeHandler();

            handler.handleCommand(makeMessage("hello world", { isBot: true }));

            expect(mh.reply).not.toHaveBeenCalled();
            expect(mh.send).not.toHaveBeenCalled();
        });
    });

    describe("isUserBanned", () => {
        it("returns true for a user in the disallowed list", () => {
            const { handler } = makeHandler({ disallowed: { "bad-id": true } });

            expect(handler.isUserBanned(makeMessage("!", { authorId: "bad-id" }))).toBe(true);
        });

        it("returns false for a user not in the disallowed list", () => {
            const { handler } = makeHandler();

            expect(handler.isUserBanned(makeMessage("!", { authorId: "good-id" }))).toBe(false);
        });
    });

    describe("isUserAllowed", () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it("allows the first request from any user", () => {
            const { handler } = makeHandler();

            expect(handler.isUserAllowed(makeMessage("!"))).toBe(true);
        });

        it("blocks a second request within the cooldown window", () => {
            const { handler } = makeHandler();
            const msg = makeMessage("!");

            handler.isUserAllowed(msg);
            vi.advanceTimersByTime(1000);

            expect(handler.isUserAllowed(msg)).toBe(false);
        });

        it("allows a request after the cooldown window elapses", () => {
            const { handler } = makeHandler();
            const msg = makeMessage("!");

            handler.isUserAllowed(msg);
            vi.advanceTimersByTime(5001);

            expect(handler.isUserAllowed(msg)).toBe(true);
        });

        it("returns false for banned users regardless of timing", () => {
            const { handler } = makeHandler({ disallowed: { "bad-id": true } });

            expect(handler.isUserAllowed(makeMessage("!", { authorId: "bad-id" }))).toBe(false);
        });

        it("sends a wait message when canSendMessage is true and user is on cooldown", () => {
            const { handler, mh } = makeHandler();
            const msg = makeMessage("!");

            handler.isUserAllowed(msg, true);
            vi.advanceTimersByTime(1000);
            handler.isUserAllowed(msg, true);

            expect(mh.send).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("wait"));
        });
    });

    describe("parseMessageArguments", () => {
        it("returns the command name and arguments", () => {
            const { handler } = makeHandler();
            const result = handler.parseMessageArguments(makeMessage("!ping arg1 arg2"));

            expect(result.command).toBe("ping");
            expect(result.args).toEqual(["arg1", "arg2"]);
        });

        it("returns empty args when no arguments are given", () => {
            const { handler } = makeHandler();
            const result = handler.parseMessageArguments(makeMessage("!ping"));

            expect(result.command).toBe("ping");
            expect(result.args).toEqual([]);
        });

        it("lowercases the command name", () => {
            const { handler } = makeHandler();

            expect(handler.parseMessageArguments(makeMessage("!PING")).command).toBe("ping");
        });
    });

    describe("handleDM", () => {
        it("routes DM commands to the dmcommands registry", () => {
            const dmCmd = makeCommand();
            const { handler } = makeHandler({ dmcommands: { test: dmCmd } });

            handler.handleDM(makeMessage("!test"));

            expect(dmCmd.function).toHaveBeenCalledOnce();
        });

        it("ignores bot messages", () => {
            const dmCmd = makeCommand();
            const { handler } = makeHandler({ dmcommands: { test: dmCmd } });

            handler.handleDM(makeMessage("!test", { isBot: true }));

            expect(dmCmd.function).not.toHaveBeenCalled();
        });

        it("replies with a help hint for unrecognised prefixed DMs", () => {
            const { handler, mh } = makeHandler();

            handler.handleDM(makeMessage("!unknown"));

            expect(mh.reply).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("help"));
        });
    });

    describe("redo", () => {
        it("re-runs the original command when a matching call is found", async () => {
            const cmd = makeCommand();
            const { handler, mh } = makeHandler({ commands: { test: cmd } });
            const callMessage = makeMessage("!test");
            const replyMessage = makeMessage("...");

            vi.mocked(mh.findFromReply).mockReturnValue("call-1");

            const fetchMessage = vi.fn().mockResolvedValue(callMessage);

            handler.redo(replyMessage, fetchMessage);

            await vi.waitFor(() => expect(cmd.function).toHaveBeenCalledOnce());
            expect(fetchMessage).toHaveBeenCalledWith("call-1");
        });

        it("does nothing when no call is found for the reply", () => {
            const { handler, mh } = makeHandler();
            const fetchMessage = vi.fn();

            vi.mocked(mh.findFromReply).mockReturnValue(undefined);

            handler.redo(makeMessage("..."), fetchMessage);

            expect(fetchMessage).not.toHaveBeenCalled();
        });
    });
});
