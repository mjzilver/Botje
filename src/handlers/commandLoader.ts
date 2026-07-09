import fs from "fs";
import path from "path";
import { createRequire } from "node:module";
import type { ICommand, IClCommand, ILogger } from "../interfaces";

export interface LoadedCommands {
    commands: Record<string, ICommand>;
    admincommands: Record<string, ICommand>;
    dmcommands: Record<string, ICommand>;
    clcommands: Record<string, IClCommand>;
    disabled: Set<string>;
}

function getModuleExport<T>(module: unknown): T {
    if (typeof module === "object" && module !== null && "default" in module) {
        return (module as { default: T }).default;
    }

    return module as T;
}

function loadCommandsFromDir<T extends ICommand | IClCommand>(
    dirPath: string,
    target: Record<string, T>,
    disabled: Set<string>,
): void {
    if (!fs.existsSync(dirPath)) {
        return;
    }

    const require = createRequire(dirPath + path.sep);

    for (const file of fs.readdirSync(dirPath)) {
        if (file.endsWith(".d.ts")) {
            continue;
        }

        if (!file.endsWith(".ts") && !file.endsWith(".js")) {
            continue;
        }

        const command = getModuleExport<T>(require(path.join(dirPath, file)));

        if (!command.name) {
            continue;
        }

        if (command.disabled) {
            disabled.add(command.name);

            if (command.aliases) {
                for (const alias of command.aliases.split(",").map((a) => a.trim())) {
                    if (alias) {
                        disabled.add(alias);
                    }
                }
            }

            continue;
        }

        target[command.name] = command;

        if (command.aliases) {
            for (const alias of command.aliases.split(",").map((a) => a.trim())) {
                if (alias) {
                    target[alias] = command;
                }
            }
        }
    }
}

export function loadCommands(baseDir: string, logger: ILogger): LoadedCommands {
    const commands: Record<string, ICommand> = {};
    const admincommands: Record<string, ICommand> = {};
    const dmcommands: Record<string, ICommand> = {};
    const clcommands: Record<string, IClCommand> = {};
    const disabled = new Set<string>();

    loadCommandsFromDir(path.join(baseDir, "commands"), commands, disabled);
    loadCommandsFromDir(path.join(baseDir, "commands/listers"), commands, disabled);
    loadCommandsFromDir(path.join(baseDir, "commands/admincommands"), admincommands, disabled);
    loadCommandsFromDir(path.join(baseDir, "commands/clcommands"), clcommands, disabled);
    loadCommandsFromDir(path.join(baseDir, "commands/dmcommands"), dmcommands, disabled);

    logger.startup(`[CommandLoader] Loaded ${Object.keys(commands).length} commands`);
    logger.startup(`[CommandLoader] Loaded ${Object.keys(admincommands).length} admin commands`);
    logger.startup(`[CommandLoader] Loaded ${Object.keys(clcommands).length} clcommands`);
    logger.startup(`[CommandLoader] Loaded ${Object.keys(dmcommands).length} dmcommands`);

    return {
        commands,
        admincommands,
        dmcommands,
        clcommands,
        disabled,
    };
}
