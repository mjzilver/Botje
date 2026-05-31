import fs from "fs";
import Jimp from "jimp";
import type { ICommand, IBotContext } from "../interfaces";
import type { BotMessage } from "../interfaces/discord";
import { replaceFancyQuotes, resolveImageUrl } from "../systems/stringHelpers";
import { toError } from "../systems/utils";

async function processPicture(
    url: string | null,
    top: string,
    bottom: string,
    message: BotMessage,
    context: IBotContext,
): Promise<void> {
    if (!url) {
        const path = "assets/meme_templates";
        const files = fs.readdirSync(path);
        const chosenFile = files[Math.floor(Math.random() * files.length)];
        url = `${path}/${chosenFile}`;
    }

    top = top ? replaceFancyQuotes(top.toUpperCase().trim()) : "";
    bottom = bottom ? replaceFancyQuotes(bottom.toUpperCase().trim()) : "";
    let image = await Jimp.read(url);
    const font = await Jimp.loadFont("assets/font.fnt");
    image = image.resize(800, Jimp.AUTO);
    image.print(
        font,
        0,
        0,
        { text: top, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER, alignmentY: Jimp.VERTICAL_ALIGN_TOP },
        image.bitmap.width,
        image.bitmap.height * 0.1,
    );
    image.print(
        font,
        0,
        image.bitmap.height * 0.9,
        { text: bottom, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER, alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM },
        image.bitmap.width,
        image.bitmap.height * 0.1,
    );
    await image.writeAsync("assets/meme.png");
    context.messageHandler.reply(message, { files: ["assets/meme.png"] });
}

export default {
    name: "meme",
    description: "adds captions to an image to create a meme",
    format: "meme (url) (top text) (bottom text)",
    options: [
        { type: "string", name: "image", description: "The image URL to use for the meme", required: false },
        { type: "string", name: "top", description: "Top text for the meme", required: false },
        { type: "string", name: "bottom", description: "Bottom text for the meme", required: false },
    ],
    async function(message, context) {
        try {
            const args = message.content.split(" ");
            args.shift();
            const url = await resolveImageUrl(message, args);
            const [top, bottom] = (args.join(" ").split("|") || []).slice(0, 2);
            if (args[0] === "?" || !args[0]) {
                let keyword = "";
                if (args[0] === "?" && args[1]) keyword = args[1];
                const selectSQL = `SELECT message FROM messages
                WHERE message LIKE $1 AND message NOT LIKE '%http%'
                AND message NOT LIKE '%<%' AND LENGTH(message) < 70`;
                const rows = await context.database.queryRandomMessage<{ message: string }>(selectSQL, [
                    `%${keyword}%`,
                ]);
                if (rows && rows[0]) {
                    const content = rows[0].message;
                    const middle = content.lastIndexOf(" ", content.length / 2);
                    const top = content.substring(0, middle);
                    const bottom = content.substring(middle + 1);

                    return processPicture(url ?? null, top, bottom, message, context);
                }

                return context.messageHandler.reply(message, "Can't find anything related, but this is your fault");
            } else if (top) {
                if (url.match(/\.(jpeg|jpg|gif|png)/gi)) return processPicture(url, top, bottom, message, context);

                return processPicture(null, top, bottom, message, context);
            }
        } catch (err) {
            context.logger.error(toError(err));
            context.messageHandler.reply(message, "Something went wrong while creating the meme.");
        }
    },
} satisfies ICommand;
