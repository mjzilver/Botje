import { describe, it, expect, vi, beforeEach } from "vitest";
import youtubeCommand from "../../commands/youtube";
import { makeMockContext, makeMessage } from "@test/helpers";

vi.mock("axios", () => ({ default: { get: vi.fn() } }));

describe("youtube command – execution", () => {
    beforeEach(() => vi.clearAllMocks());

    it("replies with video URL when results are found", async () => {
        const axios = await import("axios");
        vi.mocked(axios.default.get).mockResolvedValueOnce({
            data: { items: [{ id: { videoId: "abc123" }, snippet: { title: "Cool video" } }] },
        });

        const context = makeMockContext();
        await youtubeCommand.function(makeMessage("!youtube cats"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("abc123"));
    });

    it("replies with 'Nothing found' when items array is empty", async () => {
        const axios = await import("axios");
        vi.mocked(axios.default.get).mockResolvedValueOnce({ data: { items: [] } });

        const context = makeMockContext();
        await youtubeCommand.function(makeMessage("!youtube something"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining("Nothing found"),
        );
    });

    it("logs error and does not reply when request throws", async () => {
        const axios = await import("axios");
        vi.mocked(axios.default.get).mockRejectedValueOnce(new Error("network error"));

        const context = makeMockContext();
        await youtubeCommand.function(makeMessage("!youtube cats"), context);

        expect(context.logger.error).toHaveBeenCalled();
        expect(context.messageHandler.reply).not.toHaveBeenCalled();
    });

    it("uses keyword from message content in URL", async () => {
        const axios = await import("axios");
        vi.mocked(axios.default.get).mockResolvedValueOnce({
            data: { items: [{ id: { videoId: "xyz" } }] },
        });

        const context = makeMockContext();
        await youtubeCommand.function(makeMessage("!youtube funny dogs"), context);

        const url: string = (axios.default.get as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(url).toContain(encodeURIComponent("funny dogs"));
    });
});
