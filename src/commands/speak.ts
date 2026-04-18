import type { ICommand, IBotContext } from "../interfaces";
import { textOnly, normalizeSpaces, countVowelGroups, makeStringHelpers } from "../systems/stringHelpers";
import { randomBetween, levenshtein, pickRandomItem } from "../systems/utils";
import type { BotMessage } from "../interfaces/discord";

async function findByWord(message: BotMessage, context: IBotContext): Promise<void> {
    const { removePrefix } = makeStringHelpers(context.config);
    const earliest = new Date();
    earliest.setMonth(earliest.getMonth() - 5);
    let filtered = removePrefix(message.content).replace(
        /(:.+:|<.+>|@.*|\b[a-z] |\bbot(?:je)?\b|http.*|speak)\b/gi,
        "",
    );
    filtered = textOnly(filtered);
    filtered = filtered.replace(context.dictionary.getNonSelectorsRegex(), "").trim();
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
    const selectSQL = `SELECT LOWER(message) as message
        FROM messages
        WHERE (message LIKE $1 OR message LIKE $2)
        AND message NOT LIKE '%<%' AND LENGTH(message) > 10`;
    const rows = await context.database.query<{
        message: string;
    }>(selectSQL, [`%${topic} is%`, `%${topic} are%`]);
    if (rows.length < 3) {
        context.logger.debug("Not enough info about topic -- redirecting to the regular method");
        message.content = message.content.replace(/(about|think|of)/gi, "");

        return findByWord(message, context);
    }

    const IS_ARE_REGEX = /\b(?:is|are)\b/gi;
    let first = rows[0].message;
    let second = rows[1].message;
    let third = rows[2].message;
    context.logger.debug(`Picked terms related to '${topic}', first '${first}', second '${second}', third '${third}'`);

    function extractTopicPhrase(msg: string, topicStr: string, removeTopic = false, regex?: RegExp): string {
        const topicLower = topicStr.toLowerCase();
        const idx = msg.indexOf(topicLower);
        if (idx === -1) return msg;
        const result = removeTopic ? msg.substring(idx + topicLower.length) : msg.substring(idx);

        return regex ? result.replace(regex, "").trim() : result.trim();
    }

    first = extractTopicPhrase(first, topic);
    second = extractTopicPhrase(second, topic, true, IS_ARE_REGEX);
    third = extractTopicPhrase(third, topic, true, IS_ARE_REGEX);
    const linkerwords = ["and", "or", "but", "also"];
    const picker = randomBetween(0, 2);
    if (picker === 0) context.messageHandler.reply(message, normalizeSpaces(`${first}`));
    else if (picker === 1)
        context.messageHandler.reply(message, normalizeSpaces(`${first} ${pickRandomItem(linkerwords)} ${second}`));
    else
        context.messageHandler.reply(
            message,
            normalizeSpaces(`${first}, ${second} ${pickRandomItem(linkerwords)} ${third}`),
        );
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
