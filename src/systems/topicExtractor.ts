import type { BotMessage } from "../interfaces/discord";
import type { IDatabase } from "./database";
import type { IDictionary } from "./dictionary";
import { textOnly, normalizeSpaces, countVowelGroups } from "./stringHelpers";

const MIN_WORD_LENGTH = 4;
const CANDIDATE_LIMIT = 10;

export const CONTEXT_WINDOW_MS = 10 * 60 * 60 * 1000;
export const CONTEXT_LIMIT = 20;

export async function fetchContextMessages(channel: BotMessage["channel"]): Promise<BotMessage[]> {
    const fetched = await channel.messages.fetch({ limit: CONTEXT_LIMIT });
    const cutoff = Date.now() - CONTEXT_WINDOW_MS;

    return [...fetched.values()].filter((m) => !m.author.bot && m.createdTimestamp > cutoff);
}

export async function extractTopics(
    messages: { cleanContent: string }[],
    db: IDatabase,
    dictionary: IDictionary,
    prefix?: string,
): Promise<string[]> {
    const prefixRe = prefix ? new RegExp(`^(?:${prefix})`, "i") : null;
    const filtered = prefixRe
        ? messages.filter((m) => !prefixRe.test(m.cleanContent))
        : messages;
    const tf = computeTf(filtered, dictionary);
    if (tf.size === 0) return [];

    const candidates = [...tf.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, CANDIDATE_LIMIT)
        .map(([word]) => word);

    const scored = await Promise.all(
        candidates.map(async (word) => {
            const rows = await db.query<{ cnt: string }>(
                "SELECT COUNT(*) AS cnt FROM messages WHERE message ILIKE $1",
                [`%${word}%`],
            );
            const df = parseInt(rows[0]?.cnt ?? "1", 10);
            const idf = 1 / Math.log(df + 2);
            return { word, score: (tf.get(word) ?? 0) * idf * countVowelGroups(word) };
        }),
    );

    return scored.sort((a, b) => b.score - a.score).map((s) => s.word);
}

function computeTf(
    messages: { cleanContent: string }[],
    dictionary: IDictionary,
): Map<string, number> {
    const freq = new Map<string, number>();
    const stopWords = dictionary.getStopWords();

    for (const m of messages) {
        const words = normalizeSpaces(textOnly(m.cleanContent))
            .toLowerCase()
            .split(" ")
            .filter((w) => w.length >= MIN_WORD_LENGTH && !stopWords.has(w));

        for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
    }

    return freq;
}
