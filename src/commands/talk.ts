import type { ICommand } from "../interfaces";
import { capitalize } from "../systems/stringHelpers";
import { randomBetween } from "../systems/utils";

export default {
    name: "talk",
    description: "makes the bot talk via predictive text or as if it were the mentioned user",
    format: "talk (@user)",
    options: [{ type: "user", name: "user", description: "The user to mimic (optional)", required: false }],
    async function(message, context) {
        const mention = message.mentions?.users?.first?.() as
            | {
                  id: string;
              }
            | undefined;
        const chain: Record<string, string[]> = {};
        const selectSQL = mention
            ? `SELECT message FROM messages WHERE message NOT LIKE '%<%' AND user_id = $1`
            : `SELECT message FROM messages WHERE message NOT LIKE '%<%'`;
        const rows = await context.database.query<{
            message: string;
        }>(selectSQL, mention ? [mention.id] : []);
        for (let i = 0; i < rows.length; i++) {
            const words = rows[i].message.split(" ");
            let prevWord = "";
            for (let j = 0; j < words.length; j++) {
                const word = words[j].toLowerCase();
                if (!chain[prevWord]) chain[prevWord] = [word];
                else {
                    if (!Array.isArray(chain[prevWord])) chain[prevWord] = [];
                    chain[prevWord].push(word);
                }

                prevWord = word;
            }
        }

        let sentence = "";
        const sentenceLength = randomBetween(8, 15);
        if (chain[""]) {
            let previousWord = chain[""][randomBetween(0, chain[""].length - 1)];
            sentence += previousWord;
            for (let i = 0; i < sentenceLength - 1; i++) {
                if (chain[previousWord]) {
                    const currentWord = chain[previousWord][randomBetween(0, chain[previousWord].length - 1)];
                    sentence += ` ${currentWord}`;
                    previousWord = currentWord;
                }
            }

            context.messageHandler.send(message, capitalize(sentence));
        }
    },
} satisfies ICommand;
