import type { ICommand } from "../interfaces";
export default {
    name: "ping",
    description: "prints the current reaction speed of bot in milliseconds",
    format: "ping",
    async function(message, context) {
        const m = await context.messageHandler.send(message, "Ping?");
        if (m) context.messageHandler.edit(m, `Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms.`);
    },
} satisfies ICommand;
