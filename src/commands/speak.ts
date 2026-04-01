import type { ICommand, IBotContext } from "../interfaces";
import { textOnly, normalizeSpaces, countVowelGroups } from "../systems/stringHelpers";
import { makeStringHelpers } from "../systems/stringHelpers";
import { randomBetween, levenshtein, pickRandomItem } from "../systems/utils";
import type { BotMessage } from "../interfaces/discord";

async function findByWord(message: BotMessage, context: IBotContext): Promise<void> {
    const { removePrefix } = makeStringHelpers(context.config);
    const earliest = new Date();
    earliest.setMonth(earliest.getMonth() - 5);
    let _words = removePrefix(message.content).replace(/(:.+:|<.+>|@.*|\b[a-z] |\bbot(?:je)?\b|http.*|speak)\b/gi, "");
    _words = textOnly(_words);
    _words = _words.replace(context.dictionary.getNonSelectorsRegex(), "").trim();
    const words = _words.split(" ");
    if (words && words.length >= 1 && words[0]) {
        if (words.length > 1) {
            words.sort((a, b) => countVowelGroups(b) - countVowelGroups(a));
        }
        if (words.length > 1) {
            const selectSQL = `SELECT message FROM messages
                WHERE message NOT LIKE '%http%' AND message NOT LIKE '%www%' AND message NOT LIKE '%bot%'
                AND message LIKE '%_ _%' AND message LIKE '%_ _%_%'
                AND LENGTH(message) < 150 AND LENGTH(message) > 10
                AND datetime < ${message.createdAt.getTime()} AND datetime < ${earliest.getTime()}`;
            const rows = await context.database.query<{
                message: string;
            }>(selectSQL, []);
            if (rows) {
                context.logger.debug(`Sending message with '${words.join(",")}" in it`);
                let highestAmount = 0;
                let chosenMessage = "";
                const regexPatterns = words.map((w: string) => new RegExp(w, "gmi"));
                for (let i = 0; i < rows.length; i++) {
                    let amount = 0;
                    for (let j = 0; j < regexPatterns.length; j++)
                        if (rows[i]["message"].match(regexPatterns[j])) amount += 30 - j * j;
                    if (amount > highestAmount)
                        if (levenshtein(rows[i]["message"], message.content) > 15) {
                            chosenMessage = rows[i]["message"];
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
                AND message LIKE '%${words[0]}%' AND LENGTH(message) > 10
                AND datetime < ${message.createdAt.getTime()} AND datetime < ${earliest.getTime()}`;
            const rows = await context.database.queryRandomMessage<{
                message: string;
            }>(selectSQL, []);
            if (rows) {
                context.logger.debug(`Sending message with '${words[0]}' in it`);
                context.messageHandler.send(message, normalizeSpaces(rows[0]["message"]));
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
        AND datetime < ${earliest.getTime()} AND LENGTH(message) > 10`;
    const rows = await context.database.queryRandomMessage<{
        message: string;
    }>(selectSQL, []);
    if (rows) context.messageHandler.send(message, normalizeSpaces(rows[0]["message"]));
}

async function findTopic(message: BotMessage, topic: string, context: IBotContext): Promise<void> {
    const selectSQL = `SELECT LOWER(message) as message
        FROM messages
        WHERE message LIKE '%${topic} is%' OR message LIKE '%${topic} are%'
        AND message NOT LIKE '%<%' AND LENGTH(message) > 10`;
    const rows = await context.database.query<{
        message: string;
    }>(selectSQL, []);
    if (rows.length < 3) {
        context.logger.debug("Not enough info about topic -- redirecting to the regular method");
        message.content = message.content.replace(/(about|think|of)/gi, "");

        return await findByWord(message, context);
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
