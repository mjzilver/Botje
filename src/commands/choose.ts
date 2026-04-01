import type { ICommand } from "../interfaces";
import { pickRandomItem } from "../systems/utils";

export default {
    name: "choose",
    description: "chooses one of the options given",
    format: "choose [option] | [option2]",
    options: [
        {
            type: "string",
            name: "choices",
            description: "Options separated by | (e.g., pizza | pasta | salad)",
            required: true,
        },
    ],
    function(message, context) {
        const filtered = message.content.split(/\s+/).slice(1).join(" ");
        const items = filtered.split("|");
        const presets = [
            "You should",
            "You ought to",
            "I pick",
            "I tell you",
            "An Angel told me in a dream that",
            "The tarot card reads",
        ];
        if (items.length < 2)
            return context.messageHandler.reply(
                message,
                `Please provide at least two options \nUse format \`${this.format}\``,
            );

        return context.messageHandler.reply(message, `${pickRandomItem(presets)} \`${pickRandomItem(items).trim()}\``);
    },
} satisfies ICommand;
