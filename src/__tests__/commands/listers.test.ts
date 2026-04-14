import { describe, it, expect } from "vitest";
import countCommand from "../../commands/listers/count";
import saidCommand from "../../commands/listers/said";
import reactionsCommand from "../../commands/listers/reactions";
import repliesCommand from "../../commands/listers/replies";
import qualityCommand from "../../commands/listers/quality";
import emotesCommand from "../../commands/listers/emotes";
import scoreCommand from "../../commands/listers/score";
import syllablesCommand from "../../commands/listers/syllables";
import phraseCommand from "../../commands/listers/phrase";
import { makeMockContext , makeMessage, makeNoGuildMessage } from "@test/helpers";

describe("count lister", () => {
    it("has name 'count'", () => expect(countCommand.name).toBe("count"));

    it("replies out-of-server error when guild is null", () => {
        const context = makeMockContext();

        countCommand.function(makeNoGuildMessage("!count"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            "This command only works in a server.",
        );
    });
});

describe("said lister", () => {
    it("has name 'said'", () => expect(saidCommand.name).toBe("said"));

    it("replies out-of-server error when guild is null", () => {
        const context = makeMockContext();

        saidCommand.function(makeNoGuildMessage("!said"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            "This command only works in a server.",
        );
    });
});

describe("reactions lister", () => {
    it("has name 'reactions'", () => expect(reactionsCommand.name).toBe("reactions"));

    it("replies out-of-server error when guild is null", () => {
        const context = makeMockContext();

        reactionsCommand.function(makeNoGuildMessage("!reactions"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            "This command only works in a server.",
        );
    });
});

describe("replies lister", () => {
    it("has name 'replies'", () => expect(repliesCommand.name).toBe("replies"));

    it("replies out-of-server error when guild is null", () => {
        const context = makeMockContext();

        repliesCommand.function(makeNoGuildMessage("!replies"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            "This command only works in a server.",
        );
    });
});

describe("quality lister", () => {
    it("has name 'quality'", () => expect(qualityCommand.name).toBe("quality"));

    it("replies out-of-server error when guild is null", () => {
        const context = makeMockContext();

        qualityCommand.function(makeNoGuildMessage("!quality"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            "This command only works in a server.",
        );
    });
});

describe("emotes lister", () => {
    it("has name 'emotes'", () => expect(emotesCommand.name).toBe("emotes"));

    it("replies out-of-server error when guild is null", () => {
        const context = makeMockContext();

        emotesCommand.function(makeNoGuildMessage("!emotes"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            "This command only works in a server.",
        );
    });
});

describe("score lister", () => {
    it("has name 'score'", () => expect(scoreCommand.name).toBe("score"));

    it("replies out-of-server error when guild is null", () => {
        const context = makeMockContext();

        scoreCommand.function(makeNoGuildMessage("!score"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            "This command only works in a server.",
        );
    });
});

describe("syllables lister", () => {
    it("has name 'syllables'", () => expect(syllablesCommand.name).toBe("syllables"));

    it("replies out-of-server error when guild is null", () => {
        const context = makeMockContext();

        syllablesCommand.function(makeNoGuildMessage("!syllables"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            "This command only works in a server.",
        );
    });
});

describe("phrase lister", () => {
    it("has name 'phrase'", () => expect(phraseCommand.name).toBe("phrase"));

    it("replies out-of-server error when guild is null", () => {
        const context = makeMockContext();

        phraseCommand.function(makeNoGuildMessage("!phrase"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            "This command only works in a server.",
        );
    });
});
