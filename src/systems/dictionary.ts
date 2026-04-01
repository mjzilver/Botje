import fs from "fs";
import path from "path";
import type { IDatabase, ILogger } from "../interfaces";
import { textOnly } from "./stringHelpers";
import { toError } from "./utils";
type WordEntry = [word: string, frequency: number];
const DICTIONARY_TOP_WORDS = 200;
const MIN_WORD_FREQUENCY = 20;
export class Dictionary {
    words: WordEntry[] = [];
    private wordsPath: string;
    private db: IDatabase;
    private logger: ILogger;
    constructor(db: IDatabase, logger: ILogger, wordsPath = path.resolve(__dirname, "../json/words.json")) {
        this.db = db;
        this.logger = logger;
        this.wordsPath = wordsPath;
        if (fs.existsSync(this.wordsPath)) this.loadWordsFromFile();
        else {
            this.logger.console("words.json not found, generating new file");
            this.generateWordsFile();
        }
    }
    private loadWordsFromFile(): void {
        const stream = fs.createReadStream(this.wordsPath, { encoding: "utf8" });
        let rawData = "";
        stream.on("data", (chunk: string | Buffer) => {
            rawData += chunk.toString();
        });
        stream.on("end", () => {
            this.words = JSON.parse(rawData) as WordEntry[];
        });
        stream.on("error", (err) => {
            this.logger.error(toError(err));
        });
    }
    async generateWordsFile(): Promise<void> {
        const sql = `
            SELECT LOWER(message) as message
            FROM messages
            WHERE message NOT LIKE '%<%' AND message != ''
        `;
        const wordHolder: Record<string, number> = {};
        try {
            const rows = await this.db.query<{
                message: string;
            }>(sql);
            for (const row of rows)
                for (const word of row.message.split(/\s+/)) wordHolder[word] = (wordHolder[word] ?? 0) + 1;
            this.words = Object.entries(wordHolder);
            this.words.sort(([, a], [, b]) => b - a);
            const shortList = this.words.slice(0, DICTIONARY_TOP_WORDS);
            fs.writeFile(this.wordsPath, JSON.stringify(shortList), (err) => {
                if (err) this.logger.error(toError(err));
            });
        } catch (err) {
            this.logger.error(toError(err));
        }
    }
    getWordsByLength(length: number): string[] {
        return this.words
            .filter(([word, freq]) => {
                const processed = textOnly(word);
                return processed.length === length && freq > MIN_WORD_FREQUENCY;
            })
            .map(([word]) => textOnly(word));
    }
    getNonSelectorsRegex(amount = 100): RegExp {
        const max = Math.min(this.words.length, amount);
        const terms = this.words
            .slice(0, max)
            .map(([w]) => w)
            .join("|");
        return new RegExp(`\\b((${terms})\\s)\\b`, "gmi");
    }
}
