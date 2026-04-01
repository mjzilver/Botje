import type { IClCommand, IBotContext } from "../../interfaces";

export default {
    name: "exit",
    description: "forcefully shuts down the bot",
    format: "exit",
    function(_input: string[], context: IBotContext) {
        context.logger.warn(" --- Shutting down the bot --- ");
        context.client.destroy();
        process.exit();
    },
} satisfies IClCommand;
