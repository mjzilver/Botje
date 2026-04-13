import { describe, it, expect, vi } from "vitest";
import addmemeCommand from "../../../commands/admincommands/addmeme";
import deleteafterCommand from "../../../commands/admincommands/deleteafter";
import disallowCommand from "../../../commands/admincommands/disallow";

vi.mock("fs", () => ({
    default: { readFileSync: vi.fn().mockReturnValue("{}"), writeFile: vi.fn() },
    readFileSync: vi.fn().mockReturnValue("{}"),
    writeFile: vi.fn(),
}));
import logCommand from "../../../commands/admincommands/log";
import nukeCommand from "../../../commands/admincommands/nuke";
import purgeCommand from "../../../commands/admincommands/purge";
import { makeMockContext } from "../../helpers/mockContext";
import { makeMessage } from "../../helpers/mockMessage";

describe("addmeme", () => {
    it("has name 'addmeme'", () => expect(addmemeCommand.name).toBe("addmeme"));

    it("does nothing when message has no URL, attachment, or embed", async () => {
        const context = makeMockContext();

        await addmemeCommand.function(makeMessage("!addmeme"), context);

        expect(context.messageHandler.reply).not.toHaveBeenCalled();
    });
});

describe("deleteafter", () => {
    it("has name 'deleteafter'", () => expect(deleteafterCommand.name).toBe("deleteafter"));

    it("calls message.reply when there is no reference", async () => {
        const context = makeMockContext();
        const msg = makeMessage("!deleteafter");
        const replySpy = vi.fn().mockResolvedValue(undefined);

        msg.reply = replySpy;

        await deleteafterCommand.function(msg, context);

        expect(replySpy).toHaveBeenCalledWith(expect.stringContaining("reply to a message"));
    });
});

describe("disallow", () => {
    it("has name 'disallow'", () => expect(disallowCommand.name).toBe("disallow"));

    it("sends error when no mention is provided", () => {
        const context = makeMockContext();

        disallowCommand.function(makeMessage("!disallow"), context);

        expect(context.messageHandler.send).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining("@ someone"),
        );
    });
});

describe("log", () => {
    it("has name 'log'", () => expect(logCommand.name).toBe("log"));
});

describe("nuke", () => {
    it("has name 'nuke'", () => expect(nukeCommand.name).toBe("nuke"));

    it("sends rejection message to non-owner", async () => {
        const context = makeMockContext();

        await nukeCommand.function(makeMessage("!nuke", { authorId: "not-owner-id" }), context);

        expect(context.messageHandler.send).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining("server owner"),
        );
    });
});

describe("purge", () => {
    it("has name 'purge'", () => expect(purgeCommand.name).toBe("purge"));
});
