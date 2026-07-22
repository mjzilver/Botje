import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import type { IBotContext, ICommand } from "../interfaces";
import type { BotMessage } from "../interfaces/discord";
import { EmbedBuilder } from "../interfaces/discord";
import { pickRandomItem, toError } from "../utils";
import { colorHex, isImage, isLink } from "../utils/helpers/stringHelpers";

interface RedditPost {
    url: string;
    title: string;
    score: number;
    author: string;
    permalink: string;
    name: string;
}

chromium.use(stealth());

let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

async function getBrowser() {
    if (!browser) {
        browser = await chromium.launch({
            headless: true,
            args: ["--disable-blink-features=AutomationControlled", "--no-sandbox", "--disable-dev-shm-usage"],
        });
    }

    return browser;
}

export function buildRedditUrl(sub: string, sort: string, time: string): string {
    let url = `https://www.reddit.com/r/${sub}/${sort}/`;
    if (sort === "top") {
        url += `?t=${time}`;
    }

    return url;
}

export function parseRedditArgs(content: string): {
    sub: string;
    sort: string;
    time: string;
} {
    const args = content.split(" ");
    const sub = args[1] ?? "";
    let sort = "hot";
    let time = "month";

    if (["top", "hot", "new"].includes(args[2])) {
        sort = args[2];
    }
    if (["hour", "day", "week", "month", "year", "all"].includes(args[3])) {
        time = args[3];
    }

    return { sub, sort, time };
}

async function getRedditImage(message: BotMessage, context: IBotContext): Promise<void> {
    const { sub, sort, time } = parseRedditArgs(message.content);

    if (!sub || !/^[A-Za-z0-9_]{1,21}$/.test(sub)) {
        await context.messageHandler.send(message, "Please provide a valid subreddit name.");

        return;
    }

    try {
        const browser = await getBrowser();
        const page = await browser.newPage({
            userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15",
        });
        const url = buildRedditUrl(sub, sort, time);
        await page.goto(url, {
            waitUntil: "networkidle",
            timeout: 30000,
        });
        await page.waitForSelector("shreddit-post", {
            timeout: 15000,
        });
        const posts: RedditPost[] = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll("shreddit-post")) as HTMLElement[];

            return elements.map((post) => ({
                url: post.getAttribute("content-href") ?? "",
                title: post.getAttribute("post-title") ?? "",
                score: Number(post.getAttribute("score")) || 0,
                author: post.getAttribute("author") ?? "unknown",
                permalink: post.getAttribute("permalink") ?? "",
                name: post.getAttribute("id") ?? "",
            }));
        });

        await page.close();

        if (!posts.length) {
            await context.messageHandler.send(message, "No images were found");

            return;
        }

        await handleRedditImages(message, sub, posts, context);
    } catch (err) {
        context.logger.error(toError(err));
    }
}

async function handleRedditImages(
    message: BotMessage,
    sub: string,
    children: RedditPost[],
    context: IBotContext,
): Promise<void> {
    const selectSQL = "SELECT * FROM images WHERE sub = $1";
    const foundImages: Record<string, boolean> = {};

    try {
        const rows = await context.database.query<{
            link: string;
        }>(selectSQL, [sub]);
        for (const row of rows) {
            foundImages[row.link] = true;
        }

        const filteredImages = children.filter((post) => !foundImages[post.url] && isLink(post.url));

        if (filteredImages.length > 0) {
            const post = pickRandomItem(filteredImages);
            if (post.url.match(/imgur\.com/gi)) {
                await handleImgur(message, post, sub, context);
            } else {
                embedImage(message, post, sub, context);
            }

            await insertPost(post, sub, context);
        } else {
            await context.messageHandler.send(message, "I have ran out of images to show you");
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
            .setFooter({
                text: `From: reddit/r/${sub}`,
            });

        context.messageHandler.send(message, {
            embeds: [image],
        });
    } else if (post.url.match(/v\.redd\.it/gi)) {
        handleRedirect(message, post, context);
    } else {
        context.messageHandler.send(message, `${post.title}\n${post.url}\n<https://reddit.com${post.permalink}>`);
    }
}

async function handleImgur(message: BotMessage, post: RedditPost, sub: string, context: IBotContext): Promise<void> {
    try {
        const browser = await getBrowser();
        const page = await browser.newPage();
        await page.goto(post.url, {
            waitUntil: "networkidle",
        });
        post.url = page.url();
        await page.close();
        embedImage(message, post, sub, context);
    } catch (err) {
        context.logger.error(toError(err));
    }
}

async function handleRedirect(message: BotMessage, post: RedditPost, context: IBotContext): Promise<void> {
    try {
        const browser = await getBrowser();
        const page = await browser.newPage();

        await page.goto(post.url, {
            waitUntil: "networkidle",
        });

        const redirectUrl = page.url();
        await page.close();
        context.logger.console(`Redirected to ${redirectUrl}`);
        const responsePage = await browser.newPage();
        await responsePage.goto(`${redirectUrl}.json`, { waitUntil: "networkidle" });
        const body = await responsePage.evaluate(() => document.body?.innerText ?? "");
        await responsePage.close();
        const json = JSON.parse(body);
        const videoLink = json?.[0]?.data?.children?.[0]?.data?.secure_media?.reddit_video?.fallback_url;

        if (videoLink) {
            context.messageHandler.send(message, `${post.title}\n${videoLink}\n<https://reddit.com${post.permalink}>`);
        } else {
            await getRedditImage(message, context);
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
    async function(message, context) {
        await getRedditImage(message, context);
    },
} satisfies ICommand;
