import axios from "axios";
import { EmbedBuilder } from "../interfaces/discord";
import type { ICommand, IBotContext } from "../interfaces";
import { toError, pickRandomItem } from "../systems/utils";
import { colorHex, isLink, isImage } from "../systems/stringHelpers";
import type { BotMessage } from "../interfaces/discord";

interface RedditPost {
    url: string;
    title: string;
    score: number;
    author: string;
    permalink: string;
    name: string;
    secure_media?: {
        reddit_video?: {
            fallback_url: string;
        };
    };
}
interface RedditChild {
    data: RedditPost;
}
const botHeader = {
    "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
};
const axiosInstance = axios.create({ headers: botHeader, maxRedirects: 10 });

export function buildRedditUrl(sub: string, sort: string, time: string, last = ""): string {
    return `https://www.reddit.com/r/${sub}/${sort}.json?sort=${sort}&t=${time}&limit=100&after=${last}`;
}
export function parseRedditArgs(content: string): { sub: string; sort: string; time: string } {
    const args = content.split(" ");
    const sub = args[1] ?? "";
    let sort = "hot";
    let time = "month";
    if (["top", "hot", "new"].includes(args[2])) sort = args[2];
    if (["hour", "day", "week", "month", "year", "all"].includes(args[3])) time = args[3];

    return { sub, sort, time };
}

async function getRedditImage(message: BotMessage, context: IBotContext, last = ""): Promise<void> {
    const { sub, sort, time } = parseRedditArgs(message.content);
    if (!sub || !/^[A-Za-z0-9_]{1,21}$/.test(sub)) {
        context.messageHandler.send(message, "Please provide a valid subreddit name.");

        return;
    }

    const url = buildRedditUrl(sub, sort, time, last);
    try {
        const response = await axiosInstance.get(url);
        const body = response.data;
        if (body?.data?.children) await handleRedditImages(message, sub, body.data.children, context);
        else context.messageHandler.send(message, "No images were found");
    } catch (err) {
        context.logger.error(toError(err));
    }
}

async function handleRedditImages(
    message: BotMessage,
    sub: string,
    children: RedditChild[],
    context: IBotContext,
): Promise<void> {
    const selectSQL = "SELECT * FROM images WHERE sub = $1";
    const foundImages: Record<string, boolean> = {};
    try {
        const rows = await context.database.query<{
            link: string;
        }>(selectSQL, [sub]);
        for (const row of rows) foundImages[row.link] = true;
        const filteredImages = children.filter((c) => !(c.data.url in foundImages) && isLink(c.data.url));
        if (filteredImages.length > 0) {
            const post = pickRandomItem(filteredImages).data;
            if (post.url.match(/imgur\.com/gi)) handleImgur(message, post, sub, context);
            else embedImage(message, post, sub, context);
            insertPost(post, sub, context);
        } else {
            if (children.length >= 100) {
                context.logger.debug(`Finding posts before post ${children[children.length - 1].data.title}`);
                getRedditImage(message, context, children[children.length - 1].data.name);
            } else {
                context.messageHandler.send(message, "I have ran out of images to show you");
            }
        }
    } catch (err) {
        context.logger.error(toError(err));
    }
}

function embedImage(message: BotMessage, post: RedditPost, sub: string, context: IBotContext): void {
    if (isImage(post.url)) {
        const image = new EmbedBuilder()
            .setColor(colorHex(context.config.color_hex))
            .setTitle(post.title)
            .addFields(
                { name: "Updoots", value: `${post.score}`, inline: true },
                { name: "Posted by", value: `${post.author}`, inline: true },
            )
            .setImage(post.url)
            .setURL(`https://reddit.com${post.permalink}`)
            .setFooter({ text: `From: reddit/r/${sub}` });
        context.messageHandler.send(message, { embeds: [image] });
    } else if (post.url.match(/v\.redd\.it/gi)) {
        handleRedirect(message, post, context);
    } else if (post.url) {
        context.messageHandler.send(message, `${post.title} \n${post.url} \n<https://reddit.com${post.permalink}>`);
    }
}

async function handleImgur(message: BotMessage, post: RedditPost, sub: string, context: IBotContext): Promise<void> {
    try {
        const res = await axiosInstance.get(post.url);
        if (res.request.res.responseUrl.includes("removed.png")) {
            context.logger.debug("Found removed.png, finding new image");
            getRedditImage(message, context);
        } else {
            post.url = res.request.res.responseUrl;
            embedImage(message, post, sub, context);
        }
    } catch (err) {
        context.logger.error(toError(err));
    }
}

async function handleRedirect(message: BotMessage, post: RedditPost, context: IBotContext): Promise<void> {
    try {
        const res = await axiosInstance.get(post.url);
        const redirectUrl = res.request.res.responseUrl;
        context.logger.console(`Redirected to ${redirectUrl}`);
        let url = decodeURIComponent(redirectUrl);
        if (redirectUrl.includes("over18"))
            url = url.substring(
                url.indexOf("https://www.reddit.com/over18?dest=") + "https://www.reddit.com/over18?dest=".length,
            );
        try {
            const response = await axiosInstance.get(`${url}.json`);
            const body = response.data;
            const videoLink = body?.[0]?.data?.children?.[0]?.data?.secure_media?.reddit_video?.fallback_url;
            if (videoLink)
                context.messageHandler.send(
                    message,
                    `${post.title} \n${videoLink} \n<https://reddit.com${post.permalink}>`,
                );
            else getRedditImage(message, context);
        } catch (err) {
            context.logger.error(toError(err));
        }
    } catch (err) {
        context.logger.error(toError(err));
    }
}

async function insertPost(post: RedditPost, sub: string, context: IBotContext): Promise<void> {
    const insertSQL =
        "INSERT INTO images (link, sub) VALUES ($1, $2) ON CONFLICT (link) DO UPDATE SET sub = EXCLUDED.sub;";
    try {
        await context.database.insert(insertSQL, [post.url, sub]);
        context.logger.debug(`inserted: ${post.url} - ${sub}`);
    } catch (err) {
        context.logger.error(toError(err));
    }
}

export default {
    name: "reddit",
    description: "gets a random link from the given subreddit",
    format: "reddit [subreddit] (top|hot|new) (hour|day|week|month|year|all)",
    options: [
        { type: "string", name: "subreddit", description: "The subreddit name", required: true },
        {
            type: "string",
            name: "sort",
            description: "Sort method",
            required: false,
            choices: [
                { name: "Hot", value: "hot" },
                { name: "Top", value: "top" },
                { name: "New", value: "new" },
            ],
        },
        {
            type: "string",
            name: "time",
            description: "Time period for top posts",
            required: false,
            choices: [
                { name: "Hour", value: "hour" },
                { name: "Day", value: "day" },
                { name: "Week", value: "week" },
                { name: "Month", value: "month" },
                { name: "Year", value: "year" },
                { name: "All Time", value: "all" },
            ],
        },
    ],
    function(message, context) {
        getRedditImage(message, context);
    },
} satisfies ICommand;
