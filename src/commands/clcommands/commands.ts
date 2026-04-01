import type { IClCommand, IBotContext } from "../../interfaces";
export default {
    name: "commands",
    description: "shows description and format for all chat commands",
    format: "commands",
    function(_input: string[], context: IBotContext) {
        const commands = context.loadedCommands.commands;
        context.logger.printColumns(
            [
                Object.values(commands).map((cmd) => cmd.name),
                Object.values(commands).map((cmd) => cmd.format),
                Object.values(commands).map((cmd) => cmd.description),
            ],
            ["Name", "Format", "Description"],
        );
    },
} satisfies IClCommand;
