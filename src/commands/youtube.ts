import axios from "axios";
import type { ICommand } from "../interfaces";
import { toError } from "../systems/utils";

export default {
    name: "youtube",
    description: "searches for a youtube video",
    format: "youtube [keyword]",
    options: [{ type: "string", name: "keyword", description: "Search term", required: true }],
    async function(message, context) {
        const keyword = message.content.split(/\s+/).slice(1).join(" ");
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=25&q=${encodeURIComponent(keyword)}&key=${context.config.youtube_api_key}`;
        context.logger.debug(`"${message.author?.username}" requested youtube video with keyword "${keyword}"`);
        try {
            const response = await axios.get(url);
            const body = response.data;
            if (!body.items[0]) {
                context.messageHandler.reply(message, `Nothing found for "${keyword}"`);
            } else {
                const video = body.items[0];
                context.messageHandler.reply(message, `https://www.youtube.com/watch?v=${video.id.videoId}`);
            }
        } catch (err) {
            context.logger.error(toError(err));
        }
    },
} satisfies ICommand;
