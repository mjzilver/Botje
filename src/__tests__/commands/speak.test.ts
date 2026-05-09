import { describe, it, expect, vi, beforeEach } from "vitest";
import speakCommand from "../../commands/speak";
import { makeMockContext, makeMessage } from "@test/helpers";

describe("speak command – findTopic path", () => {
    beforeEach(() => vi.clearAllMocks());

    it("falls back to findByWord when fewer than 3 topic rows are returned", async () => {
        const context = makeMockContext();

        vi.mocked(context.dictionary.getNonSelectorsRegex).mockReturnValue(/$/g);
        vi.mocked(context.database.query).mockResolvedValueOnce([{ message: "cats is cool" }]);
        vi.mocked(context.database.queryRandomMessage).mockResolvedValueOnce([
            { message: "cats are everywhere in this city" },
        ]);

        await speakCommand.function(makeMessage("!speak about cats"), context);

        await vi.waitFor(() =>
            expect(context.messageHandler.send).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining("cats"),
            ),
        );
    });

    it("produces a composite reply when 3 or more topic rows are available", async () => {
        const context = makeMockContext();

        vi.mocked(context.database.query).mockResolvedValueOnce([
            { message: "cats is very cool" },
            { message: "cats are nice animals" },
            { message: "cats are fluffy and soft" },
        ]);

        await speakCommand.function(makeMessage("!speak about cats"), context);

        await vi.waitFor(() => expect(context.messageHandler.reply).toHaveBeenCalled());
        const replyArg = vi.mocked(context.messageHandler.reply).mock.calls[0]?.[1] as string;

        expect(typeof replyArg).toBe("string");
        expect(replyArg.length).toBeGreaterThan(0);
    });

    it("uses findByWord directly when content has no topic trigger", async () => {
        const context = makeMockContext();

        vi.mocked(context.dictionary.getNonSelectorsRegex).mockReturnValue(/$/g);
        vi.mocked(context.database.queryRandomMessage).mockResolvedValueOnce([
            { message: "just a random sentence from the database" },
        ]);

        await speakCommand.function(makeMessage("!speak hello"), context);

        await vi.waitFor(() => expect(context.messageHandler.send).toHaveBeenCalled());
        expect(context.database.query).not.toHaveBeenCalled();
    });
});
