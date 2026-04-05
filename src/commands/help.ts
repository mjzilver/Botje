import { EmbedBuilder } from "../interfaces/discord";
import type { ICommand } from "../interfaces";
import packageJson from "../../package.json";

export default {
    name: "help",
    description: "sends this helpful message",
    format: "help",
    async function(message, context) {
        const commandList = Object.values(context.loadedCommands.commands);
        const pages = await context.pagination.createPages(
            commandList,
            10,
            (pageCommands: ICommand[], pageNum: number, totalPages: number) => {
                let helpMessage = `**Here is a list of all the commands *you* can use: **\nFormat: \`()\` = optional argument, \`[]\` = required argument\n`;
                for (const command of pageCommands) helpMessage += `\`${command.format}\`: ${command.description} \n`;

                return new EmbedBuilder()
                    .setColor(context.config.color_hex)
                    .setTitle(":robot: Current commands: :robot:")
                    .setDescription(helpMessage)
                    .setFooter({ text: `Page ${pageNum}/${totalPages} \nCurrent Version: ${packageJson.version}` });
            },
        );

        return context.pagination.sendPaginatedEmbed(message, pages);
    },
} satisfies ICommand;
