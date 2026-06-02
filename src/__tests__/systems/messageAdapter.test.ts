import { describe, it, expect } from "vitest";
import { ApplicationCommandOptionType } from "discord.js";
import type * as discord from "discord.js";
import { interactionToMessage } from "../../systems/messageAdapter";

function makeInteraction(opts: {
    id?: string;
    commandName?: string;
    subcommand?: string | null;
    options?: discord.CommandInteractionOption[];
    userId?: string;
    guildId?: string;
    createdTimestamp?: number;
}): discord.ChatInputCommandInteraction {
    const {
        id = "interaction-id",
        subcommand = null,
        options = [],
        userId = "user-id",
        guildId = "guild-id",
        createdTimestamp = 1000000,
    } = opts;

    const optionData = subcommand
        ? [
              {
                  name: subcommand,
                  type: ApplicationCommandOptionType.Subcommand,
                  options,
              } as discord.CommandInteractionOption,
          ]
        : options;

    return {
        id,
        user: { id: userId, username: "TestUser" },
        guild: { id: guildId },
        channel: null,
        createdTimestamp,
        options: {
            getSubcommand: () => subcommand,
            data: optionData,
        },
    } as unknown as discord.ChatInputCommandInteraction;
}

describe("interactionToMessage", () => {
    it("sets content to the command name when there are no arguments", () => {
        const msg = interactionToMessage(makeInteraction({}), "!ping");

        expect(msg.content).toBe("!ping");
        expect(msg.cleanContent).toBe("!ping");
    });

    it("appends string options to content", () => {
        const opts: discord.CommandInteractionOption[] = [
            {
                name: "query",
                type: ApplicationCommandOptionType.String,
                value: "cats",
            } as discord.CommandInteractionOption,
        ];
        const msg = interactionToMessage(makeInteraction({ options: opts }), "!youtube");

        expect(msg.content).toBe("!youtube cats");
    });

    it("appends integer options to content", () => {
        const opts: discord.CommandInteractionOption[] = [
            {
                name: "sides",
                type: ApplicationCommandOptionType.Integer,
                value: 20,
            } as discord.CommandInteractionOption,
        ];
        const msg = interactionToMessage(makeInteraction({ options: opts }), "!roll");

        expect(msg.content).toBe("!roll 20");
    });

    it("prepends subcommand name and appends its options", () => {
        const subOpts: discord.CommandInteractionOption[] = [
            {
                name: "user",
                type: ApplicationCommandOptionType.User,
                value: "abc",
                user: { id: "abc", username: "Alice" },
            } as unknown as discord.CommandInteractionOption,
        ];
        const msg = interactionToMessage(makeInteraction({ subcommand: "top", options: subOpts }), "!count");

        expect(msg.content).toBe("!count top <@abc>");
    });

    it("puts mentioned users into the mention map", () => {
        const subOpts: discord.CommandInteractionOption[] = [
            {
                name: "user",
                type: ApplicationCommandOptionType.User,
                value: "abc",
                user: { id: "abc", username: "Alice" },
            } as unknown as discord.CommandInteractionOption,
        ];
        const msg = interactionToMessage(makeInteraction({ subcommand: "top", options: subOpts }), "!count");

        expect(msg.mentions.users.has("abc")).toBe(true);
        expect(msg.mentions.users.first()?.id).toBe("abc");
    });

    it("sets metadata fields correctly", () => {
        const ts = 1718000000000;
        const msg = interactionToMessage(
            makeInteraction({ id: "ix", userId: "u1", guildId: "g1", createdTimestamp: ts }),
            "!ping",
        );

        expect(msg.id).toBe("ix");
        expect(msg.author.id).toBe("u1");
        expect(msg.createdTimestamp).toBe(ts);
        expect(msg.createdAt).toEqual(new Date(ts));
        expect(msg.isSlashCommand).toBe(true);
        expect(msg.reference).toBeNull();
        expect(msg.member).toBeNull();
    });

    it("reply and edit stubs resolve to the same message object", async () => {
        const msg = interactionToMessage(makeInteraction({}), "!ping");

        await expect(msg.reply({ content: "hi" })).resolves.toBe(msg);
        await expect(msg.edit({ content: "hi" })).resolves.toBe(msg);
        await expect(msg.delete()).resolves.toBe(msg);
    });
});
