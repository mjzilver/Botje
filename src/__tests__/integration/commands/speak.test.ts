import { describe, it, expect, vi } from "vitest";
import speakCommand from "../../../commands/speak";
import { makeMockContext } from "../../helpers/mockContext";
import { makeMessage } from "../../helpers/mockMessage";

describe("speak — integration", () => {
    it("sends a message from the database when no word argument is given", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.queryRandomMessage).mockResolvedValue([{ message: "hello from the database" }]);

        await speakCommand.function(makeMessage("!speak"), context);

        expect(context.messageHandler.send).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining("hello from the database"),
        );
    });

    it("queries database with a word filter when two words are provided", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.query).mockResolvedValue([
            { message: "hello world, the quick brown fox jumps over the lazy dog" },
        ]);

        await speakCommand.function(makeMessage("!speak hello world"), context);

        expect(context.database.query).toHaveBeenCalled();
        expect(context.messageHandler.send).toHaveBeenCalled();
    });

    it("uses queryRandomMessage for a single word argument", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.queryRandomMessage).mockResolvedValue([{ message: "speaking of hello" }]);

        await speakCommand.function(makeMessage("!speak hello"), context);

        expect(context.database.queryRandomMessage).toHaveBeenCalled();
        expect(context.messageHandler.send).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining("speaking of hello"),
        );
    });
});
