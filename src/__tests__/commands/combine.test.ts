import fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("fs");
vi.mock("jimp", () => {
    const fakeImage = {
        resize: vi.fn().mockReturnThis(),
        crop: vi.fn().mockReturnThis(),
        composite: vi.fn().mockReturnThis(),
        writeAsync: vi.fn().mockResolvedValue(undefined),
    };

    class Jimp {
        public read = vi.fn().mockResolvedValue(fakeImage);
    }

    return { default: Jimp };
});

import { makeMessage, makeMockContext } from "@test/helpers";
import combineCommand from "../../commands/combine";

describe("combine", () => {
    beforeEach(() => vi.clearAllMocks());

    it("replies with the combined image file", async () => {
        const context = makeMockContext();
        vi.mocked(fs.readdirSync).mockReturnValue(["pepe.png", "wave.png"] as never);

        await combineCommand.function(makeMessage("!combine pepe wave"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ files: expect.arrayContaining([expect.stringContaining(".png")]) }),
        );
    });

    it("picks random emotes when no args are given", async () => {
        const context = makeMockContext();
        vi.mocked(fs.readdirSync).mockReturnValue(["kek.png"] as never);

        await combineCommand.function(makeMessage("!combine"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ files: expect.any(Array) }),
        );
    });

    it("extracts emote names from discord emote syntax", async () => {
        const context = makeMockContext();
        vi.mocked(fs.readdirSync).mockReturnValue(["pepe.png", "wave.png"] as never);

        await combineCommand.function(makeMessage("!combine <:pepe:123> <:wave:456>"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ files: expect.any(Array) }),
        );
    });
});
