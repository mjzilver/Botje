import Sentiment from "sentiment";
import nlp from "compromise";

const analyser = new Sentiment();

const INDEFINITE_PRONOUN_RE = /^(some|any|every|no)(thing|body|one|where|time)$/;
const CONTRACTION_ARTIFACT_RE = /^(i|you|they|that|its)(ve|re|ll|s|d)$/;

export interface TopicScores {
    likes: string[];
    dislikes: string[];
}

function escapeRegex(word: string): string {
    return word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function flattenCalculation(raw: unknown): Record<string, number> {
    if (!Array.isArray(raw)) return raw as Record<string, number>;
    const result: Record<string, number> = {};
    for (const entry of raw as Record<string, number>[]) {
        for (const [k, v] of Object.entries(entry)) result[k] = v;
    }

    return result;
}

function extractScoredWordObjects(
    text: string,
    calculation: Record<string, number>,
): { topic: string; score: number }[] {
    const results: { topic: string; score: number }[] = [];
    const lower = text.toLowerCase();

    for (const [word, wordScore] of Object.entries(calculation)) {
        if (wordScore === 0) continue;
        const re = new RegExp(`\\b${escapeRegex(word)}\\s+([a-z]{3,})`, "g");
        let m: RegExpExecArray | null;
        while ((m = re.exec(lower)) !== null) {
            const topic = m[1];
            if (!INDEFINITE_PRONOUN_RE.test(topic) && !CONTRACTION_ARTIFACT_RE.test(topic)) {
                results.push({ topic, score: wordScore * 2 });
            }
        }
    }

    return results;
}

function isValidTopic(word: string): boolean {
    const terms = nlp(word).json() as { terms: { tags: string[]; dirty?: boolean }[] }[];
    const term = terms[0]?.terms?.[0];
    if (!term?.dirty) return true;

    return term.tags.includes("Noun") || (term.tags.includes("Gerund") && word.length >= 6);
}

export function scoreMessages(messages: string[], stopWords: Set<string>): TopicScores {
    const scores = new Map<string, number>();
    const sentimentWords = new Set<string>();

    const addScore = (topic: string, value: number): void => {
        if (stopWords.has(topic)) return;
        scores.set(topic, (scores.get(topic) ?? 0) + value);
    };

    for (const text of messages) {
        const result = analyser.analyze(text);
        const calculation = flattenCalculation(result.calculation);

        for (const word of Object.keys(calculation)) sentimentWords.add(word);

        for (const { topic, score } of extractScoredWordObjects(text, calculation)) {
            addScore(topic, score);
        }
    }

    for (const word of sentimentWords) scores.delete(word);

    for (const word of scores.keys()) {
        if (!isValidTopic(word)) scores.delete(word);
    }

    const ranked = [...scores.entries()].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

    const likes = ranked
        .filter(([, s]) => s > 0)
        .slice(0, 5)
        .map(([t]) => t);

    const dislikes = ranked
        .filter(([, s]) => s < 0)
        .slice(0, 5)
        .map(([t]) => t);

    return { likes, dislikes };
}
