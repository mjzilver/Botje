import { describe, it, expect, vi } from "vitest";
import youtubeCommand from "./youtube";
import { makeMockContext } from "../__tests__/helpers/mockContext";
import { makeMessage } from "../__tests__/helpers/mockMessage";

vi.mock("axios", () => ({ default: { get: vi.fn() } }));

describe("youtube", () => {
    it("has name 'youtube'", () => expect(youtubeCommand.name).toBe("youtube"));

    it("replies 'Nothing found' when api returns no items", async () => {
        const axios = await import("axios");

        vi.mocked(axios.default.get).mockResolvedValueOnce({ data: { items: [] } });

        const context = makeMockContext();

        await youtubeCommand.function(makeMessage("!youtube something"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining("Nothing found"),
        );
    });
});
