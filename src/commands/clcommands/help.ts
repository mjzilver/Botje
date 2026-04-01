import type { IClCommand, IBotContext } from "../../interfaces";
export default {
    name: "help",
    description: "shows description and format for each console command",
    format: "help",
    function(_input: string[], context: IBotContext) {
        const clcommands = context.loadedCommands.clcommands;
        context.logger.printColumns(
            [
                Object.values(clcommands).map((cmd) => cmd.name),
                Object.values(clcommands).map((cmd) => cmd.format),
                Object.values(clcommands).map((cmd) => cmd.description),
            ],
            ["Name", "Format", "Description"],
        );
    },
} satisfies IClCommand;
