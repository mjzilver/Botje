import Sentiment from "sentiment";
import nlp from "compromise";

const analyser = new Sentiment();

export interface TopicScores {
    likes: string[];
    dislikes: string[];
}

function extractScoredWordObjects(text: string): { topic: string; score: number }[] {
    const result = analyser.analyze(text);
    const results: { topic: string; score: number }[] = [];

    const calculation = result.calculation as unknown as Record<string, number>;

    for (const [word, wordScore] of Object.entries(calculation)) {
        if (wordScore === 0) continue;
        const matches = (
            nlp(text).match(`${word} [#Noun+]`).out("array") as string[]
        ).concat(
            nlp(text).match(`${word} [#Gerund]`).out("array") as string[],
        );

        for (const match of matches) {
            const topic = match
                .toLowerCase()
                .replace(new RegExp(`^${word}\\s*`, "i"), "")
                .replace(/[^a-z ]/g, "")
                .trim();

            if (topic.length >= 3) results.push({ topic, score: wordScore * 2 });
        }
    }

    return results;
}

function extractSentimentNouns(text: string, comparative: number): { topic: string; score: number }[] {
    if (comparative === 0) return [];

    const nouns = (nlp(text).nouns().not("#Pronoun").out("array") as string[])
        .flatMap((p: string) => p.split(" "))
        .map((w: string) => w.toLowerCase().replace(/[^a-z]/g, ""))
        .filter((w: string) => w.length >= 4);

    return nouns.map((topic) => ({ topic, score: comparative }));
}

export function scoreMessages(messages: string[], stopWords: Set<string>): TopicScores {
    const scores = new Map<string, number>();

    const addScore = (topic: string, value: number): void => {
        if (stopWords.has(topic)) return;
        scores.set(topic, (scores.get(topic) ?? 0) + value);
    };

    for (const text of messages) {
        const result = analyser.analyze(text);

        for (const { topic, score } of extractScoredWordObjects(text)) {
            addScore(topic, score);
        }

        for (const { topic, score } of extractSentimentNouns(text, result.comparative)) {
            addScore(topic, score);
        }
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
