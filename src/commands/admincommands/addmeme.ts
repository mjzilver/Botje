import fs from "fs";
import { pipeline } from "stream/promises";
import axios from "axios";
import type { ICommand } from "../../interfaces";
import { toError } from "../../utils";
import { resolveImageUrl } from "../../utils/helpers/stringHelpers";

export default {
    name: "addmeme",
    description: "adds an image to the meme templates",
    format: "addmeme (url) (filename)",
    async function(message, context) {
        const args = message.content.split(" ");
        args.shift();
        const url = await resolveImageUrl(message, args);
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
