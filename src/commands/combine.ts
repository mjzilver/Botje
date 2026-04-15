import fs from "fs";
import Jimp from "jimp";
import type { ICommand, IBotContext } from "../interfaces";
import type { BotMessage } from "../interfaces/discord";
import { findClosestMatchInList, pickRandomItem } from "../systems/utils";

const emoteParser = /:(.+?)(~.*)?:[0-9]*/;

async function processCombination(
    image1: string,
    image2: string,
    message: BotMessage,
    context: IBotContext,
): Promise<void> {
    const path = `backups/emotes/${message.guild?.id}/`;
    const outputPath = "assets/combined.png";
    const img1 = await Jimp.read(path + image1);
    const img2 = await Jimp.read(path + image2);
    img1.resize(128, 128);
    img2.resize(128, 128);
    img1.crop(0, 0, 128, 64);
    img2.crop(0, 64, 128, 64);
    const combined = new Jimp(128, 128);
    combined.composite(img1, 0, 0);
    combined.composite(img2, 0, 64);
    await combined.writeAsync(outputPath);
    context.messageHandler.reply(message, { files: [outputPath] });
}

export default {
    name: "combine",
    description: "combines two emotes into one",
    format: "combine [emote name] [emote name]",
    options: [
        { type: "string", name: "emote1", description: "The first emote to combine", required: false },
        { type: "string", name: "emote2", description: "The second emote to combine", required: false },
    ],
    async function(message, context) {
        const args = message.content.split(" ");
        args.shift();
        const path = `backups/emotes/${message.guild?.id}/`;
        const files = fs.readdirSync(path);
        if (!args[0]) args[0] = pickRandomItem(files);
        if (!args[1]) args[1] = pickRandomItem(files);
        let image1 = `${args[0]}.png`;
        let image2 = `${args[1]}.png`;
        if (!files.includes(image1) || !files.includes(image2)) {
            const m1 = args[0].match(emoteParser);
            const m2 = args[1].match(emoteParser);
            if (m1) image1 = `${m1[1]}.png`;
            if (m2) image2 = `${m2[1]}.png`;
            if (!files.includes(image1) || !files.includes(image2)) {
                image1 = findClosestMatchInList(args[0], files);
                image2 = findClosestMatchInList(args[1], files);

                return processCombination(image1, image2, message, context);
            }

            return processCombination(image1, image2, message, context);
        }

        return processCombination(image1, image2, message, context);
    },
} satisfies ICommand;
