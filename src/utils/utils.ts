import fs from "fs";

export function levenshtein(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++)
        for (let j = 1; j <= a.length; j++)
            if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
            else
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));

    return matrix[b.length][a.length];
}

export function findClosestMatchInList(word: string, wordList: string[] | Record<string, number>): string {
    if (!word) return "";
    let list: Record<string, number>;
    if (Array.isArray(wordList)) {
        list = Object.fromEntries(wordList.map((item) => [item, 1]));
    } else {
        list = wordList;
    }

    word = word.toLowerCase();
    let closestMatch = "";
    let difference = Number.MAX_VALUE;
    let chosenAmount = 0;
    for (const [listWord, listAmount] of Object.entries(list)) {
        const currentDifference = levenshtein(word, listWord);
        if (currentDifference < difference) {
            difference = currentDifference;
            closestMatch = listWord;
            chosenAmount = listAmount;
        } else if (currentDifference === difference) {
            if (listAmount < chosenAmount) {
                closestMatch = listWord;
                chosenAmount = listAmount;
            }
        }
    }

    return closestMatch;
}

export function formatUptime(ms: number): string {
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms / 3600000) % 24);
    const minutes = Math.floor((ms / 60000) % 60);
    const seconds = Math.ceil((ms / 1000) % 60);

    return [
        days ? `${days} days, ` : "",
        hours ? `${hours} hours, ` : "",
        minutes ? `${minutes} minutes and ` : "",
        `${seconds} seconds`,
    ].join("");
}

export function randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

export function pickRandomItem<T>(array: T[]): T {
    if (!Array.isArray(array) || array.length === 0) throw new Error("Array must be non-empty to pick a random item");

    return array[randomBetween(0, array.length - 1)];
}

export function toError(err: unknown): Error {
    return err instanceof Error ? err : new Error(String(err));
}

export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function readGuildEmoteDir(guildId: string | undefined): { path: string; files: string[] } {
    const path = `backups/emotes/${guildId}/`;

    return { path, files: fs.readdirSync(path) };
}
