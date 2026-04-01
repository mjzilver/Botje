import * as discord from "discord.js";
import type { ICommand } from "../../interfaces";
import packageJson from "../../../package.json";

export default {
    name: "help",
    description: "sends this helpful message",
    format: "help",
    function(message, context) {
        const dmcommands = context.loadedCommands.dmcommands;
        let helpMessage =
            "**Here is a list of all the commands *you* can use in private message (use b!help in a server to see server commands):  \n**";
        for (const [, command] of Object.entries(dmcommands))
            helpMessage += `\`${command.format}\`: ${command.description} \n`;
        const help = new discord.EmbedBuilder()
            .setColor(context.config.color_hex)
            .setTitle(":robot: Current DirectMessage commands: :robot:")
            .setDescription(helpMessage)
            .setFooter({ text: `Current Version: ${packageJson.version}` });

        return context.messageHandler.send(message, { embeds: [help] });
    },
} satisfies ICommand;
