import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import { makeMockContext, makeMessage } from "@test/helpers";

vi.mock("fs");

import getemoteCommand from "../../commands/getemote";

describe("getemote", () => {
    beforeEach(() => vi.clearAllMocks());

    it("lists all emotes in a paginated embed when no arg is given", async () => {
        const context = makeMockContext();
        vi.mocked(fs.readdirSync).mockReturnValue(["wave.png", "pepe.png"] as never);
        vi.mocked(context.pagination.createPages).mockResolvedValueOnce([]);

        await getemoteCommand.function(makeMessage("!getemote"), context);

        expect(context.pagination.createPages).toHaveBeenCalled();
        expect(context.pagination.sendPaginatedEmbed).toHaveBeenCalled();
    });

    it("replies with the emote file when an exact name is given", async () => {
        const context = makeMockContext();
        vi.mocked(fs.readdirSync).mockReturnValue(["wave.png", "pepe.png"] as never);
        vi.mocked(fs.existsSync).mockReturnValue(true);

        await getemoteCommand.function(makeMessage("!getemote wave"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ files: expect.arrayContaining([expect.stringContaining("wave.png")]) }),
        );
    });

    it("falls back to closest match when exact name not found", async () => {
        const context = makeMockContext();
        vi.mocked(fs.readdirSync).mockReturnValue(["waave.png"] as never);
        vi.mocked(fs.existsSync).mockReturnValue(false);

        await getemoteCommand.function(makeMessage("!getemote wave"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ files: expect.arrayContaining([expect.stringContaining("waave.png")]) }),
        );
    });
});
