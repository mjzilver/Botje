import fs from "fs";
import { EmbedBuilder } from "../interfaces/discord";
import type { ICommand } from "../interfaces";
import { findClosestMatchInList } from "../systems/utils";

export default {
    name: "getemote",
    description: "fetches a server emote by name, or lists all if omitted",
    format: "getemote (emote name)",
    options: [{ type: "string", name: "emote", description: "The name of the emote to retrieve", required: false }],
    async function(message, context) {
        const args = message.content.split(" ");
        args.shift();
        const path = `backups/emotes/${message.guild?.id}/`;
        const files = fs.readdirSync(path);
        if (!args[0]) {
            const emoteNames = files.map((f) => f.replace(".png", ""));
            const pages = await context.pagination.createPages(
                emoteNames,
                50,
                (pageEmotes: string[], pageNum: number, totalPages: number) => {
                    const result = pageEmotes.join(", ");

                    return new EmbedBuilder()
                        .setColor(context.config.color_hex)
                        .setTitle(`Emotes backed up for ${message.guild?.name}`)
                        .setDescription(result)
                        .setFooter({ text: `Page ${pageNum}/${totalPages} | Total: ${emoteNames.length} emotes` });
                },
            );
            context.pagination.sendPaginatedEmbed(message, pages);
        } else {
            const filename = `${args[0]}.png`;
            if (fs.existsSync(path + filename)) {
                context.messageHandler.reply(message, { files: [path + filename] });
            } else {
                const closestFilename = findClosestMatchInList(filename, files);
                context.messageHandler.reply(message, { files: [path + closestFilename] });
            }
        }
    },
} satisfies ICommand;
