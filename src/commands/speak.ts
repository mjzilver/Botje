import nlp from "compromise";
import type { ICommand, IBotContext } from "../interfaces";
import { textOnly, normalizeSpaces, countVowelGroups, makeStringHelpers } from "../systems/stringHelpers";
import { randomBetween, levenshtein, pickRandomItem } from "../systems/utils";
import type { BotMessage } from "../interfaces/discord";

const TOPIC_QUERY_LIMIT = 15;
const TOPIC_SENTENCE_MIN_WORDS = 4;
const TOPIC_SENTENCE_MAX_WORDS = 25;

function nlpSentences(text: string): string[] {
    const result: unknown = nlp(text).sentences().out("array");

    return Array.isArray(result) ? result.filter((s): s is string => typeof s === "string") : [];
}

export function extractTopicSentences(rawMessages: string[], topic: string): string[] {
    const topicLower = topic.toLowerCase();

    return rawMessages
        .flatMap((msg) => nlpSentences(msg))
        .filter((s) => s.toLowerCase().includes(topicLower))
        .map((s) => {
            const clean = s.trim().replace(/\s+/g, " ");

            return clean.charAt(0).toUpperCase() + clean.slice(1);
        })
        .filter((s) => {
            const wordCount = s.split(/\s+/).length;

            return wordCount >= TOPIC_SENTENCE_MIN_WORDS && wordCount <= TOPIC_SENTENCE_MAX_WORDS;
        });
}

async function findByWord(message: BotMessage, context: IBotContext): Promise<void> {
    const { removePrefix } = makeStringHelpers(context.config);
    const earliest = new Date();
    earliest.setMonth(earliest.getMonth() - 5);
    let filtered = removePrefix(message.content).replace(
        /(:.+:|<.+>|@.*|\b[a-z] |\bbot(?:je)?\b|http.*|speak)\b/gi,
        "",
    );
    filtered = textOnly(filtered);
    filtered = filtered.replace(context.dictionary.getStopWordsRegex(), "").trim();
    const words = filtered.split(" ");
    if (words[0]) {
        if (words.length > 1) {
            words.sort((a, b) => countVowelGroups(b) - countVowelGroups(a));
        }
        if (words.length > 1) {
            const selectSQL = `SELECT message FROM messages
                WHERE message NOT LIKE '%http%' AND message NOT LIKE '%www%' AND message NOT LIKE '%bot%'
                AND message LIKE '%_ _%' AND message LIKE '%_ _%_%'
                AND LENGTH(message) < 150 AND LENGTH(message) > 10
                AND datetime < $1 AND datetime < $2`;
            const rows = await context.database.query<{
                message: string;
            }>(selectSQL, [message.createdAt.getTime(), earliest.getTime()]);
            if (rows.length > 0) {
                context.logger.debug(`Sending message with '${words.join(",")}" in it`);
                let highestAmount = 0;
                let chosenMessage = "";
                const regexPatterns = words.map((w: string) => new RegExp(w, "gmi"));
                for (const row of rows) {
                    let amount = 0;
                    for (const [j, pattern] of regexPatterns.entries())
                        if (row.message.match(pattern)) amount += 30 - j * j;
                    if (amount > highestAmount && levenshtein(row.message, message.content) > 15) {
                        chosenMessage = row.message;
                        highestAmount = amount;
                    }
                }

                chosenMessage = chosenMessage.replace(/@.*/gi, "");
                context.logger.debug(`Sending message '${chosenMessage}' with score '${highestAmount}'`);
                context.messageHandler.send(message, chosenMessage);
            }
        } else {
            const selectSQL = `SELECT message FROM messages
                WHERE message NOT LIKE '%http%' AND message NOT LIKE '%www%' AND message NOT LIKE '%bot%'
                AND message LIKE '%_ _%' AND message LIKE '%_ _%_%'
                AND message LIKE $1 AND LENGTH(message) > 10
                AND datetime < $2 AND datetime < $3`;
            const rows = await context.database.queryRandomMessage<{
                message: string;
            }>(selectSQL, [`%${words[0]}%`, message.createdAt.getTime(), earliest.getTime()]);
            if (rows.length > 0) {
                context.logger.debug(`Sending message with '${words[0]}' in it`);
                context.messageHandler.send(message, normalizeSpaces(rows[0].message));
            }
        }
    } else {
        await findRandom(message, context);
    }
}

async function findRandom(message: BotMessage, context: IBotContext): Promise<void> {
    context.logger.debug("Sending randomly selected message");
    const earliest = new Date();
    earliest.setMonth(earliest.getMonth() - 5);
    const selectSQL = `SELECT message FROM messages
        WHERE message NOT LIKE '%http%' AND message NOT LIKE '%www%' AND message NOT LIKE '%bot%'
        AND message LIKE '%_ _%' AND message LIKE '%_ _%_%'
        AND datetime < $1 AND LENGTH(message) > 10`;
    const rows = await context.database.queryRandomMessage<{
        message: string;
    }>(selectSQL, [earliest.getTime()]);
    if (rows.length > 0) context.messageHandler.send(message, normalizeSpaces(rows[0].message));
}

async function findTopic(message: BotMessage, topic: string, context: IBotContext): Promise<void> {
    const rows = await context.database.query<{ message: string }>(
        `SELECT LOWER(message) as message
        FROM messages
        WHERE (message LIKE $1 OR message LIKE $2)
        AND message NOT LIKE '%<%' AND LENGTH(message) > 10
        LIMIT ${TOPIC_QUERY_LIMIT}`,
        [`%${topic} is%`, `%${topic} are%`],
    );

    const sentences = extractTopicSentences(
        rows.map((r) => r.message),
        topic,
    );

    if (sentences.length === 0) {
        context.logger.debug("No usable sentences about topic — redirecting to the regular method");
        message.content = message.content.replace(/(about|think|of)/gi, "");

        return findByWord(message, context);
    }

    const s1 = pickRandomItem(sentences);
    const remaining = sentences.filter((s) => s !== s1);
    const reply = remaining.length > 0 && randomBetween(0, 1) === 1 ? `${s1} ${pickRandomItem(remaining)}` : s1;
    context.messageHandler.reply(message, normalizeSpaces(reply));
}

export async function speakAbout(topic: string, message: BotMessage, context: IBotContext): Promise<void> {
    await findTopic(message, topic, context);
}

export default {
    name: "speak",
    description: "makes the bot speak via recycled messages",
    format: "speak (sentence)",
    options: [
        { type: "string", name: "sentence", description: "The sentence to base the response on", required: false },
    ],
    async function(message, context) {
        const matches = textOnly(message.content).match(/(?:think of|about) +(.+)/i);
        if (matches && matches[1] !== "") await findTopic(message, matches[1], context);
        else await findByWord(message, context);
    },
} satisfies ICommand;
