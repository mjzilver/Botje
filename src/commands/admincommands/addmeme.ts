import fs from "fs";
import { pipeline } from "stream/promises";
import axios from "axios";
import type { ICommand } from "../../interfaces";
import type { BotMessage } from "../../interfaces/discord";
import { toError } from "../../systems/utils";

function getURL(message: BotMessage): string {
    if ((message.attachments?.size ?? 0) >= 1) return message.attachments?.first()?.url ?? "";
    if ((message.embeds?.length ?? 0) >= 1) return message.embeds?.[0]?.url ?? "";

    return "";
}

export default {
    name: "addmeme",
    description: "adds an image to the meme templates",
    format: "addmeme (url) (filename)",
    async function(message, context) {
        const args = message.content.split(" ");
        args.shift();
        let url: string;
        if (message.reference?.messageId) {
            const fetched = await message.channel.messages.fetch(message.reference.messageId);
            url = getURL(fetched as BotMessage);
        } else {
            url = getURL(message);
        }

        if (args[0]?.indexOf("http") === 0) url = args.shift() ?? "";
        const filename = args[0] ? `${args[0]}.png` : `${new Date().getTime()}.png`;
        if (url) {
            const path = "assets/meme_templates";
            try {
                const response = await axios.get(url, { responseType: "stream" });
                await pipeline(response.data, fs.createWriteStream(`${path}/${filename}`));
                context.messageHandler.reply(message, `Added meme to the meme templates as ${filename}`);
                context.logger.warn(`Added meme to the meme templates as ${filename}`);
            } catch (err) {
                context.logger.error(toError(err));
                context.messageHandler.reply(message, "Failed to download meme");
            }
        }
    },
} satisfies ICommand;
