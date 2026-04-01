import type { IClCommand, IBotContext } from "../../interfaces";
import { setLogLevel, getAvailableLevels, getCurrentLogLevel } from "../../systems/logger";

export default {
    name: "level",
    description: "sets logging level",
    format: "level <level>",
    function(input: string[], context: IBotContext) {
        if (input[0] && getAvailableLevels().includes(input[0])) {
            setLogLevel(input[0]);
            context.logger.console(`Logging level set to ${getCurrentLogLevel()}`);
        } else {
            context.logger.console(`Available logging levels: ${getAvailableLevels().join(", ")}`);
            context.logger.console(`Current logging level is ${getCurrentLogLevel()}`);
        }
    },
} satisfies IClCommand;
