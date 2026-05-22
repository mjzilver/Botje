import { pickRandomItem, randomBetween } from "./utils";
import { normalizeSpaces } from "./stringHelpers";

export type Chain = Record<string, string[]>;

export interface StyleProfile {
    prefersLowercase: boolean;
    targetWordCount: number;
    terminator: string;
}

export interface CachedProfile {
    chain: Chain;
    starts: [string, string][];
    style: StyleProfile;
    builtAt: number;
    messageCount: number;
}

export const MIN_MESSAGES = 150;
export const MAX_RETRIES = 5;

export function cleanMessage(raw: string, prefix: string): string | null {
    if (new RegExp(`^${prefix}`, "i").test(raw.trim())) return null;
    const cleaned = normalizeSpaces(
        raw
            .replace(/<[@#!&]?\d+>/g, "")
            .replace(/<:[a-zA-Z0-9_]+:\d+>/g, "")
            .replace(/https?:\/\/\S+/g, "")
            .replace(/www\.\S+/g, ""),
    );
    if (cleaned.split(/\s+/).filter((w) => w.length > 0).length < 3) return null;

    return cleaned;
}

export function buildStyleProfile(messages: string[]): StyleProfile {
    let letterStartCount = 0;
    let lowercaseCount = 0;
    let totalWords = 0;
    const terminatorCounts: Record<string, number> = { "": 0, ".": 0, "!": 0, "?": 0, "...": 0 };

    for (const msg of messages) {
        const first = msg.charAt(0);
        if (/[a-zA-Z]/.test(first)) {
            letterStartCount++;
            if (/[a-z]/.test(first)) lowercaseCount++;
        }

        totalWords += msg.split(/\s+/).filter((w) => w.length > 0).length;
        const trimmed = msg.trimEnd();
        if (trimmed.endsWith("...")) terminatorCounts["..."]++;
        else if (trimmed.endsWith("!")) terminatorCounts["!"]++;
        else if (trimmed.endsWith("?")) terminatorCounts["?"]++;
        else if (trimmed.endsWith(".")) terminatorCounts["."]++;
        else terminatorCounts[""]++;
    }

    const prefersLowercase = letterStartCount > 10 && lowercaseCount / letterStartCount > 0.6;
    const avgLen = Math.round(totalWords / messages.length);
    const terminator = Object.entries(terminatorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

    return {
        prefersLowercase,
        targetWordCount: Math.max(5, Math.min(18, avgLen)),
        terminator,
    };
}

export function buildChain(messages: string[]): { chain: Chain; starts: [string, string][] } {
    const chain: Chain = {};
    const starts: [string, string][] = [];

    for (const msg of messages) {
        const words = msg
            .trim()
            .split(/\s+/)
            .filter((w) => w.length > 0);
        if (words.length < 3) continue;
        starts.push([words[0], words[1]]);
        for (let i = 0; i < words.length - 2; i++) {
            const key = `${words[i].toLowerCase()} ${words[i + 1].toLowerCase()}`;
            if (!chain[key]) chain[key] = [];
            chain[key].push(words[i + 2]);
        }
    }

    return { chain, starts };
}

export function generate(chain: Chain, starts: [string, string][], targetLen: number, style: StyleProfile): string {
    const [w0, w1] = pickRandomItem(starts);
    const words: string[] = [w0, w1];
    let prev = `${w0.toLowerCase()} ${w1.toLowerCase()}`;
    const maxLen = targetLen + randomBetween(0, 4);

    while (words.length < maxLen) {
        const options = chain[prev];
        if (!options || options.length === 0) break;
        const next = pickRandomItem(options);
        words.push(next);
        const last = words.slice(-2);
        prev = `${last[0].toLowerCase()} ${last[1].toLowerCase()}`;
    }

    let result = words.join(" ");
    if (style.prefersLowercase) {
        result = result.toLowerCase();
    } else {
        result = result.charAt(0).toUpperCase() + result.slice(1);
    }

    const lastChar = result.trimEnd().slice(-1);
    if (!/[.!?]/.test(lastChar) && style.terminator) {
        result = result.trimEnd() + style.terminator;
    }

    return normalizeSpaces(result);
}

export function isVerbatimRepeat(generated: string, messages: string[]): boolean {
    const norm = generated.toLowerCase().replace(/\s+/g, " ").trim();
    if (norm.length < 20) return false;

    return messages.some((m) => m.toLowerCase().replace(/\s+/g, " ").includes(norm));
}
