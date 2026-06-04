import type { IClCommand, IBotContext } from "../../interfaces";

export default {
    name: "settings",
    description: "changes the bot's settings",
    format: "settings <setting> <value>",
    function(input: string[], context: IBotContext) {
        const setting = input[0];
        const value = input[1];
        if (!setting || !value) {
            context.logger.console("Current settings:");
            for (const [key, val] of Object.entries(context.config)) context.logger.console(`${key}: ${val}`);
        } else {
            context.settings.updateVariable(setting, value);
            context.logger.console(`Updated ${setting} to ${value}`);
        }
    },
    completer(argIndex: number, context: IBotContext): string[] {
        if (argIndex === 0) return Object.keys(context.config);

        return [];
    },
} satisfies IClCommand;
