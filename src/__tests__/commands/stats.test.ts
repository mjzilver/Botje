import { describe, it, expect, vi, beforeEach } from "vitest";
import statsCommand from "../../commands/stats";
import { makeMockContext } from "../helpers/mockContext";
import { makeMessage } from "../helpers/mockMessage";

vi.mock("../../systems/queryCache", () => ({
    queryCache: (_key: string, factory: () => Promise<unknown>) => factory(),
    CacheKey: {
        statsUser: (serverId: string, userId: string) => `stats-user:${serverId}:${userId}`,
    },
}));

const MSG_ROWS = [{ count: "42", first_seen: "1000000000000" }];
const REACT_GIVEN_ROWS = [{ count: "10" }];
const REACT_RECEIVED_ROWS = [{ count: "5" }];
const PEAK_HOUR_ROWS = [{ hour: "14", count: "8" }];

function mockDbResponses(context: ReturnType<typeof makeMockContext>): void {
    vi.mocked(context.database.query)
        .mockResolvedValueOnce(MSG_ROWS)
        .mockResolvedValueOnce(REACT_GIVEN_ROWS)
        .mockResolvedValueOnce(REACT_RECEIVED_ROWS)
        .mockResolvedValueOnce(PEAK_HOUR_ROWS);
}

describe("stats command", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("replies with guild-only error when used outside a server", async () => {
        const context = makeMockContext();
        const message = makeMessage("!stats", { guildId: undefined as unknown as string });
        Object.assign(message, { guild: null });

        await statsCommand.function(message, context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            "This command can only be used in a server.",
        );
        expect(context.database.query).not.toHaveBeenCalled();
    });

    it("fetches and sends stats for the calling user when no mention", async () => {
        const context = makeMockContext();
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValue("TestUser");
        mockDbResponses(context);
        const message = makeMessage("!stats");

        await statsCommand.function(message, context);

        expect(context.database.query).toHaveBeenCalledTimes(4);
        expect(context.messageHandler.send).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ data: expect.objectContaining({ title: "📊 Stats for TestUser" }) }),
        );
    });

    it("fetches stats for the mentioned user", async () => {
        const context = makeMockContext();
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValue("MentionedUser");
        mockDbResponses(context);
        const message = makeMessage("!stats @someone");
        Object.assign(message.mentions, {
            users: Object.assign(new Map([["other-id", { id: "other-id", username: "MentionedUser" }]]), {
                first: () => ({ id: "other-id", username: "MentionedUser" }),
            }),
        });

        await statsCommand.function(message, context);

        expect(context.userHandler.getDisplayName).toHaveBeenCalledWith("other-id", "guild-id");
        expect(context.messageHandler.send).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ data: expect.objectContaining({ title: "📊 Stats for MentionedUser" }) }),
        );
    });

    it("logs fetch start and result summary", async () => {
        const context = makeMockContext();
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValue("TestUser");
        mockDbResponses(context);

        await statsCommand.function(makeMessage("!stats"), context);

        expect(context.logger.debug).toHaveBeenCalledWith(expect.stringContaining("Fetching stats for user"));
        expect(context.logger.debug).toHaveBeenCalledWith(expect.stringContaining("42 msgs"));
    });

    it("handles zero reactions and no first-seen gracefully", async () => {
        const context = makeMockContext();
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValue("NewUser");
        vi.mocked(context.database.query)
            .mockResolvedValueOnce([{ count: "0", first_seen: null as unknown as string }])
            .mockResolvedValueOnce([{ count: "0" }])
            .mockResolvedValueOnce([{ count: "0" }])
            .mockResolvedValueOnce([]);

        await statsCommand.function(makeMessage("!stats"), context);

        expect(context.messageHandler.send).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                data: expect.objectContaining({
                    fields: expect.arrayContaining([
                        expect.objectContaining({ name: "First seen", value: "Unknown" }),
                        expect.objectContaining({ name: "Most active hour", value: "Unknown" }),
                    ]),
                }),
            }),
        );
    });

    it("logs error and replies with failure message when DB throws", async () => {
        const context = makeMockContext();
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValue("TestUser");
        vi.mocked(context.database.query).mockRejectedValue(new Error("DB down"));

        await statsCommand.function(makeMessage("!stats"), context);

        expect(context.logger.error).toHaveBeenCalledWith(expect.objectContaining({ message: "DB down" }));
        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            "Something went wrong, please try again.",
        );
    });
});
