import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";

vi.mock("fs");
vi.mock("jimp", () => {
    const fakeImage = {
        resize: vi.fn().mockReturnThis(),
        print: vi.fn().mockReturnThis(),
        bitmap: { width: 800, height: 600 },
        writeAsync: vi.fn().mockResolvedValue(undefined),
    };
    const Jimp = vi.fn().mockReturnValue(fakeImage);

    (Jimp as unknown as Record<string, unknown>).read = vi.fn().mockResolvedValue(fakeImage);
    (Jimp as unknown as Record<string, unknown>).loadFont = vi.fn().mockResolvedValue({});
    (Jimp as unknown as Record<string, unknown>).AUTO = -1;
    (Jimp as unknown as Record<string, unknown>).HORIZONTAL_ALIGN_CENTER = 2;
    (Jimp as unknown as Record<string, unknown>).VERTICAL_ALIGN_TOP = 1;
    (Jimp as unknown as Record<string, unknown>).VERTICAL_ALIGN_BOTTOM = 4;

    return { default: Jimp };
});

import memeCommand from "../../commands/meme";
import { makeMockContext, makeMessage } from "@test/helpers";

describe("meme", () => {
    beforeEach(() => vi.clearAllMocks());

    it("replies with meme file when top text is given", async () => {
        const context = makeMockContext();
        vi.mocked(fs.readdirSync).mockReturnValue(["template.jpg"] as never);

        await memeCommand.function(makeMessage("!meme top text | bottom text"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ files: expect.arrayContaining([expect.stringContaining("meme.png")]) }),
        );
    });

    it("replies error message when ? mode finds no matching DB message", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.queryRandomMessage).mockResolvedValueOnce([]);

        await memeCommand.function(makeMessage("!meme ?"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining("Can't find anything"),
        );
    });

    it("generates meme from DB message in ? mode", async () => {
        const context = makeMockContext();
        vi.mocked(fs.readdirSync).mockReturnValue(["template.jpg"] as never);
        vi.mocked(context.database.queryRandomMessage).mockResolvedValueOnce([{ message: "hello world today" }]);

        await memeCommand.function(makeMessage("!meme ?"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ files: expect.arrayContaining([expect.stringContaining("meme.png")]) }),
        );
    });
});
