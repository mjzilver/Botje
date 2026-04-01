import type { IClCommand, IBotContext } from "../../interfaces";

export default {
    name: "clear",
    description: "clears the console without effecting the logs",
    format: "clear",
    function(_input: string[], context: IBotContext) {
        console.clear();
        context.logger.console("Console was cleared");
    },
} satisfies IClCommand;
