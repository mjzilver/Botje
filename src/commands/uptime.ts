import type { ICommand } from "../interfaces";
import { formatUptime } from "../utils";

export default {
    name: "uptime",
    description: "show how long bot has been online in this session",
    format: "uptime",
    function(message, context) {
        const now = new Date();
        const diff = now.getTime() - (context.client.readyTimestamp ?? 0);
        const formattedUptime = formatUptime(diff);
        context.messageHandler.send(message, `I have been online for **${formattedUptime}** since my last restart.`);
    },
} satisfies ICommand;
