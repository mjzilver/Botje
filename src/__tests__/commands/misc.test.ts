import { describe, it, expect, vi } from "vitest";
import emojiCommand from "../../commands/emoji";
import hangmanCommand from "../../commands/hangman";
import matchCommand from "../../commands/match";
import memeCommand from "../../commands/meme";
import combineCommand from "../../commands/combine";
import youtubeCommand from "../../commands/youtube";
import weatherCommand from "../../commands/weather";
import talkCommand from "../../commands/talk";
import getemoteCommand from "../../commands/getemote";
import dmHelpCommand from "../../commands/dmcommands/help";
import { makeMockContext } from "../helpers/mockContext";
import { makeMessage } from "../helpers/mockMessage";
import type { ICommand } from "../../interfaces";

vi.mock("axios", () => ({ default: { get: vi.fn() } }));

describe("emoji", () => {
    it("has name 'emoji'", () => expect(emojiCommand.name).toBe("emoji"));

    it("sends an emoji string for each letter in non-reply message", async () => {
        const context = makeMockContext();

        await emojiCommand.function(makeMessage("!emoji abc"), context);

        expect(context.messageHandler.send).toHaveBeenCalledWith(
            expect.anything(),
            expect.any(String),
        );
    });
});

describe("hangman", () => {
    it("has name 'hangman'", () => expect(hangmanCommand.name).toBe("hangman"));

    it("delegates to context.hangman.run", () => {
        const context = makeMockContext();

        hangmanCommand.function(makeMessage("!hangman"), context);

        expect(context.hangman.run).toHaveBeenCalledOnce();
    });
});

describe("match", () => {
    it("has name 'match'", () => expect(matchCommand.name).toBe("match"));

    it("is disabled", () => expect((matchCommand as ICommand & { disabled?: boolean }).disabled).toBe(true));
});

describe("meme", () => {
    it("has name 'meme'", () => expect(memeCommand.name).toBe("meme"));
});

describe("combine", () => {
    it("has name 'combine'", () => expect(combineCommand.name).toBe("combine"));
});

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

describe("weather", () => {
    it("has name 'weather'", () => expect(weatherCommand.name).toBe("weather"));

    it("sends error when no city argument is given", async () => {
        const context = makeMockContext();

        await weatherCommand.function(makeMessage("!weather"), context);

        expect(context.messageHandler.send).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining("enter a city"),
        );
    });
});

describe("talk", () => {
    it("has name 'talk'", () => expect(talkCommand.name).toBe("talk"));
});

describe("getemote", () => {
    it("has name 'getemote'", () => expect(getemoteCommand.name).toBe("getemote"));
});

describe("dmcommands/help", () => {
    it("has name 'help'", () => expect(dmHelpCommand.name).toBe("help"));

    it("sends an embed to the user", () => {
        const context = makeMockContext();

        dmHelpCommand.function(makeMessage("!help"), context);

        expect(context.messageHandler.send).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ embeds: expect.any(Array) }),
        );
    });
});
