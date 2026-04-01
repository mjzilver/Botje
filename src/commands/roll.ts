import type { ICommand } from "../interfaces";
import { randomBetween } from "../systems/utils";
export default {
    name: "roll",
    description: "rolls a random number",
    format: "roll",
    options: [
        { type: "integer", name: "max", description: "Maximum value (default: current timestamp)", required: false },
        { type: "integer", name: "min", description: "Minimum value (default: 0)", required: false },
    ],
    function(message, context) {
        const args = message.content.split(" ");
        if (args[1] && !isNaN(Number(args[1]))) {
            if (args[2] && !isNaN(Number(args[2])))
                context.messageHandler.reply(
                    message,
                    `You rolled ${randomBetween(parseInt(args[1]), parseInt(args[2]))} between ${args[1]} and ${args[2]}`,
                );
            else
                context.messageHandler.reply(
                    message,
                    `You rolled ${randomBetween(0, parseInt(args[1]))} out of ${args[1]}`,
                );
        } else {
            const date = Date.now();
            context.messageHandler.reply(message, `You rolled ${(date / 1000).toFixed(0)}`);
        }
    },
} satisfies ICommand;
