import { describe, it, expect, vi } from "vitest";
import { EmbedBuilder } from "discord.js";
import helpCommand from "../../commands/help";
import type { ICommand } from "../../interfaces";
import type { MessageContent } from "../../interfaces/discord";
import { makeCommand, makeMockContext, makeMessage } from "@test/helpers";

describe("help command – execution", () => {
    it("calls createPages with all loaded commands", async () => {
        const commands = {
            ping: makeCommand("ping"),
            roll: makeCommand("roll"),
            speak: makeCommand("speak"),
        };
        const context = makeMockContext({
            loadedCommands: { commands, admincommands: {}, dmcommands: {}, clcommands: {} },
        });
        await helpCommand.function(makeMessage("!help"), context);

        expect(context.pagination.createPages).toHaveBeenCalledOnce();
        const items = (context.pagination.createPages as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(items).toHaveLength(3);
        expect(items.map((c: ICommand) => c.name)).toEqual(expect.arrayContaining(["ping", "roll", "speak"]));
    });

    it("calls sendPaginatedEmbed with the created pages", async () => {
        const context = makeMockContext({
            loadedCommands: {
                commands: { ping: makeCommand("ping") },
                admincommands: {},
                dmcommands: {},
                clcommands: {},
            },
        });
        await helpCommand.function(makeMessage("!help"), context);

        expect(context.pagination.sendPaginatedEmbed).toHaveBeenCalledOnce();
    });

    it("page formatter returns an EmbedBuilder", async () => {
        let capturedFormatter: ((items: ICommand[], p: number, total: number) => MessageContent) | null = null;
        const context = makeMockContext({
            loadedCommands: {
                commands: { ping: makeCommand("ping") },
                admincommands: {},
                dmcommands: {},
                clcommands: {},
            },
        });
        (context.pagination.createPages as ReturnType<typeof vi.fn>).mockImplementation(
            async <T>(
                items: T[],
                _perPage: number,
                formatter: (items: T[], p: number, total: number) => MessageContent,
            ) => {
                capturedFormatter = formatter as typeof capturedFormatter;

                return [formatter(items, 1, 1)];
            },
        );

        await helpCommand.function(makeMessage("!help"), context);

        expect(capturedFormatter).not.toBeNull();
        const result = capturedFormatter!([makeCommand("ping")], 1, 2);
        expect(result).toBeInstanceOf(EmbedBuilder);
    });

    it("page formatter includes command format in description", async () => {
        let capturedFormatter: ((items: ICommand[], p: number, total: number) => MessageContent) | null = null;
        const context = makeMockContext({
            loadedCommands: {
                commands: { roll: makeCommand("roll") },
                admincommands: {},
                dmcommands: {},
                clcommands: {},
            },
        });
        (context.pagination.createPages as ReturnType<typeof vi.fn>).mockImplementation(
            async <T>(
                items: T[],
                _perPage: number,
                formatter: (items: T[], p: number, total: number) => MessageContent,
            ) => {
                capturedFormatter = formatter as typeof capturedFormatter;

                return [formatter(items, 1, 1)];
            },
        );

        await helpCommand.function(makeMessage("!help"), context);

        const result = capturedFormatter!([makeCommand("roll")], 1, 1) as EmbedBuilder;
        const data = result.toJSON();
        expect(data.description).toContain("roll");
    });
});
