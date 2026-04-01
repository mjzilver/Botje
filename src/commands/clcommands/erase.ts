import fs from "fs";
import type { IClCommand, IBotContext } from "../../interfaces";

export default {
    name: "erase",
    description: "erases the log",
    format: "erase",
    function(_input: string[], context: IBotContext) {
        fs.truncate("bot.log", 0, (err) => {
            if (err) context.logger.error(err);
            context.logger.warn(" === Log was cleared before this === ");
        });
    },
} satisfies IClCommand;
