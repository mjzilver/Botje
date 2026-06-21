import fs from "fs";
import type { IClCommand, IBotContext } from "../../interfaces";
import { toError } from "../../utils";

export default {
    name: "erase",
    description: "erases the log",
    format: "erase",
    async function(_input: string[], context: IBotContext) {
        try {
            await fs.promises.truncate("bot.log", 0);
        } catch (err) {
            context.logger.error(toError(err));
        }

        context.logger.warn(" === Log was cleared before this === ");
    },
} satisfies IClCommand;
