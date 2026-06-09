import nlp from "compromise";
import type { BotMessage } from "../interfaces/discord";
import type { IBotContext } from "../interfaces";
import type { IDatabase } from "./database";
import type { IDictionary } from "./dictionary";
import { toError } from "./utils";

const MIN_WORD_LENGTH = 4;
const CANDIDATE_LIMIT = 10;
const MIN_DOC_FREQUENCY = 5;

const INDEFINITE_PRONOUNS = new Set([
    "everything",
    "something",
    "anything",
    "nothing",
    "everyone",
    "someone",
    "anyone",
    "noone",
    "everybody",
    "somebody",
    "anybody",
    "nobody",
    "everywhere",
    "somewhere",
    "anywhere",
    "nowhere",
    "whatever",
    "whoever",
    "whenever",
    "wherever",
    "whichever",
    "whomever",
    "however",
    "himself",
    "herself",
    "itself",
    "themselves",
    "yourself",
    "yourselves",
    "ourselves",
    "myself",
    "another",
    "other",
    "others",
]);

const URL_TOKEN_RE = /(https?:\/\/|www\.)/i;
const DISCORD_EMOTE_TOKEN_RE = /^<a?:[a-zA-Z0-9_]+:\d+>$|^:[a-zA-Z0-9_]+:$/;
const DISCORD_MENTION_TOKEN_RE = /^<[@#][!&]?\d+>$|^[@#]/;

export const CONTEXT_WINDOW_MS = 10 * 60 * 60 * 1000;

export const CONTEXT_LIMIT = 20;

export async function fetchContextMessages(channel: BotMessage["channel"]): Promise<BotMessage[]> {
    const fetched = await channel.messages.fetch({ limit: CONTEXT_LIMIT });
    const cutoff = Date.now() - CONTEXT_WINDOW_MS;

    return [...fetched.values()].filter((m) => !m.author.bot && m.createdTimestamp > cutoff);
}

export async function fetchTopicsFromContext(
    channel: BotMessage["channel"],
    db: IDatabase,
    dictionary: IDictionary,
    prefix?: string,
): Promise<string[]> {
    const recent = await fetchContextMessages(channel);

    return extractTopics(recent, db, dictionary, prefix);
}

export async function tryFetchTopics(message: BotMessage, context: IBotContext): Promise<string[] | undefined> {
    try {
        return await fetchTopicsFromContext(
            message.channel,
            context.database,
            context.dictionary,
            context.config.prefix,
        );
    } catch (err) {
        context.logger.error(toError(err));

        return undefined;
    }
}

export async function extractTopics(
    messages: { cleanContent: string }[],
    db: IDatabase,
    dictionary: IDictionary,
    prefix?: string,
): Promise<string[]> {
    const prefixRe = prefix ? new RegExp(`^(?:${prefix})`, "i") : null;
    const filtered = prefixRe ? messages.filter((m) => !prefixRe.test(m.cleanContent)) : messages;
    const tf = computeTf(filtered, dictionary, prefixRe);
    if (tf.size === 0) return [];

    const candidates = [...tf.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, CANDIDATE_LIMIT)
        .map(([word]) => word);

    const scored: { word: string; score: number }[] = [];
    for (const word of candidates) {
        const rows = await db.query<{ cnt: string }>("SELECT COUNT(*) AS cnt FROM messages WHERE message ILIKE $1", [
            `%${word}%`,
        ]);
        const df = parseInt(rows[0]?.cnt ?? "1", 10);
        if (df < MIN_DOC_FREQUENCY) continue;
        const idf = 1 / Math.log(df + 2);
        scored.push({ word, score: (tf.get(word) ?? 0) * idf });
    }

    return scored.sort((a, b) => b.score - a.score).map((s) => s.word);
}

export function extractNounTokens(text: string): string[] {
    return (nlp(text).nouns().not("#Pronoun").not("#Adjective").out("array") as string[])
        .flatMap((phrase) => phrase.split(" "))
        .map((w) => w.toLowerCase().replace(/[^a-z]/g, ""))
        .filter((w) => w.length >= MIN_WORD_LENGTH && !INDEFINITE_PRONOUNS.has(w));
}

function isNoiseToken(token: string, prefixRe: RegExp | null): boolean {
    return (
        URL_TOKEN_RE.test(token) ||
        DISCORD_EMOTE_TOKEN_RE.test(token) ||
        DISCORD_MENTION_TOKEN_RE.test(token) ||
        (prefixRe !== null && prefixRe.test(token))
    );
}

function computeTf(
    messages: { cleanContent: string }[],
    dictionary: IDictionary,
    prefixRe: RegExp | null,
): Map<string, number> {
    const freq = new Map<string, number>();
    const stopWords = dictionary.getStopWords();

    for (const m of messages) {
        const cleaned = m.cleanContent
            .split(/\s+/)
            .filter((t) => t.length > 0 && !isNoiseToken(t, prefixRe))
            .join(" ");

        const words = extractNounTokens(cleaned).filter((w) => !stopWords.has(w));

        for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
    }

    return freq;
}
