import { describe, it, expect, vi } from "vitest";
import helpCommand from "../../../commands/clcommands/help";
import commandsCommand from "../../../commands/clcommands/commands";
import exitCommand from "../../../commands/clcommands/exit";
import clearCommand from "../../../commands/clcommands/clear";
import levelCommand from "../../../commands/clcommands/level";
import eraseCommand from "../../../commands/clcommands/erase";
import settingsCommand from "../../../commands/clcommands/settings";
import reportCommand from "../../../commands/clcommands/report";
import checkdupesCommand from "../../../commands/clcommands/checkduplicates";
import backupCommand from "../../../commands/clcommands/backup";
import backupdbCommand from "../../../commands/clcommands/backupdb";
import backupemotesCommand from "../../../commands/clcommands/backupemotes";
import saveCommand from "../../../commands/clcommands/save";
import scanCommand from "../../../commands/clcommands/scan";
import cleanwebhooksCommand from "../../../commands/clcommands/cleanwebhooks";
import listCommand from "../../../commands/clcommands/list";
import { makeMockContext, TEST_CONFIG } from "../../helpers/mockContext";
import type { IClCommand } from "../../../interfaces";

describe("help (cl)", () => {
    it("has name 'help'", () => expect(helpCommand.name).toBe("help"));

    it("calls printColumns with clcommand data", () => {
        const stub: IClCommand = { name: "ping", description: "test", format: "ping", function: vi.fn() };
        const context = makeMockContext({ loadedCommands: { clcommands: { ping: stub }, commands: {}, admincommands: {}, dmcommands: {} } });

        helpCommand.function([], context);

        expect(context.logger.printColumns).toHaveBeenCalledWith(
            expect.arrayContaining([expect.arrayContaining(["ping"])]),
            expect.anything(),
        );
    });
});

describe("commands (cl)", () => {
    it("has name 'commands'", () => expect(commandsCommand.name).toBe("commands"));

    it("calls printColumns with command data", () => {
        const context = makeMockContext({ loadedCommands: { commands: {}, admincommands: {}, dmcommands: {}, clcommands: {} } });

        commandsCommand.function([], context);

        expect(context.logger.printColumns).toHaveBeenCalled();
    });
});

describe("exit (cl)", () => {
    it("has name 'exit'", () => expect(exitCommand.name).toBe("exit"));
});

describe("clear (cl)", () => {
    it("has name 'clear'", () => expect(clearCommand.name).toBe("clear"));

    it("logs that console was cleared", () => {
        const consoleClearSpy = vi.spyOn(console, "clear").mockImplementation(() => undefined);
        const context = makeMockContext();

        clearCommand.function([], context);

        expect(context.logger.console).toHaveBeenCalledWith(expect.stringContaining("cleared"));
        consoleClearSpy.mockRestore();
    });
});

describe("level (cl)", () => {
    it("has name 'level'", () => expect(levelCommand.name).toBe("level"));

    it("logs available levels when no valid level is given", () => {
        const context = makeMockContext();

        levelCommand.function([], context);

        expect(context.logger.console).toHaveBeenCalledWith(
            expect.stringContaining("Available logging levels"),
        );
    });
});

describe("erase (cl)", () => {
    it("has name 'erase'", () => expect(eraseCommand.name).toBe("erase"));
});

describe("settings (cl)", () => {
    it("has name 'settings'", () => expect(settingsCommand.name).toBe("settings"));

    it("logs all config keys when no args given", () => {
        const context = makeMockContext();

        settingsCommand.function([], context);

        expect(context.logger.console).toHaveBeenCalledWith("Current settings:");
        expect(context.logger.console).toHaveBeenCalledWith(
            expect.stringContaining(TEST_CONFIG.prefix),
        );
    });
});

describe("report (cl)", () => {
    it("has name 'report'", () => expect(reportCommand.name).toBe("report"));

    it("calls printRows with system stats when db query succeeds", async () => {
        const context = makeMockContext();

        vi.mocked(context.database.query).mockResolvedValue([{ size: "10 MB", count: "500" }]);

        await reportCommand.function([], context);

        expect(context.logger.printRows).toHaveBeenCalledWith(
            expect.arrayContaining([expect.arrayContaining(["Process ID"])]),
        );
    });
});

describe("checkduplicates (cl)", () => {
    it("has name 'checkdupes'", () => expect(checkdupesCommand.name).toBe("checkdupes"));

    it("logs duplicate count from database", async () => {
        const context = makeMockContext();

        vi.mocked(context.database.query).mockResolvedValue([
            { message: "hello", datetime: 123, count: "2" },
        ]);

        await checkdupesCommand.function([], context);

        expect(context.logger.console).toHaveBeenCalledWith("Found 1 duplicates");
    });
});

describe("backup (cl)", () => {
    it("has name 'backup'", () => expect(backupCommand.name).toBe("backup"));
});

describe("backupdb (cl)", () => {
    it("has name 'backupdb'", () => expect(backupdbCommand.name).toBe("backupdb"));

    it("calls backupHandler.backupDatabase", async () => {
        const context = makeMockContext();

        await backupdbCommand.function([], context);

        expect(context.backupHandler.backupDatabase).toHaveBeenCalledOnce();
    });
});

describe("backupemotes (cl)", () => {
    it("has name 'backupemotes'", () => expect(backupemotesCommand.name).toBe("backupemotes"));

    it("calls backupHandler.backupAllEmotes", () => {
        const context = makeMockContext();

        backupemotesCommand.function([], context);

        expect(context.backupHandler.backupAllEmotes).toHaveBeenCalledOnce();
    });
});

describe("save (cl)", () => {
    it("has name 'save'", () => expect(saveCommand.name).toBe("save"));
});

describe("scan (cl)", () => {
    it("has name 'scan'", () => expect(scanCommand.name).toBe("scan"));
});

describe("cleanwebhooks (cl)", () => {
    it("has name 'cleanwebhooks'", () => expect(cleanwebhooksCommand.name).toBe("cleanwebhooks"));
});

describe("list (cl)", () => {
    it("has name 'list'", () => expect(listCommand.name).toBe("list"));
});
