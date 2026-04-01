import { AttachmentBuilder, EmbedBuilder } from "discord.js";
import path from "path";
import type { IMessageHandler } from "./messageHandler";
import type { ILogger } from "./logger";
import wordsJson from "../json/words.json";
import type { BotConfig } from "../interfaces/config";
import type { BotMessage } from "../interfaces/discord";
import type { Dictionary } from "./dictionary";
import { pickRandomItem } from "./utils";
import { textOnly as textOnlyHelper, replaceAt as replaceAtHelper } from "./stringHelpers";

export interface IHangman {
    run(message: BotMessage): void;
}

export class HangmanGame {
    private word = "";
    private visibleWord = "";
    private maxTries = 10;
    private tries = 0;
    private alreadyGuessed: string[] = [];
    private hasEnded = true;
    private messageHandler: IMessageHandler;
    private dictionary: Dictionary;
    private config: BotConfig;
    private logger: ILogger;
    private assetsDir: string;
    constructor(
        messageHandler: IMessageHandler,
        dictionary: Dictionary,
        config: BotConfig,
        logger: ILogger,
        assetsDir = path.join(process.cwd(), "assets", "hangman"),
    ) {
        this.messageHandler = messageHandler;
        this.dictionary = dictionary;
        this.config = config;
        this.logger = logger;
        this.assetsDir = assetsDir;
    }

    run(message: BotMessage): void {
        const args = message.cleanContent.toLowerCase().split(" ");
        switch (args[1]) {
            case "start":
                this.start(message);
                break;
            case "guess":
                this.guess(message, args[2]);
                break;
            case "help":
            default:
                this.help(message);
        }
    }

    private start(message: BotMessage): void {
        if (!this.hasEnded) {
            this.messageHandler.send(message, "A game of hangman is still ongoing");

            return;
        }

        this.word = "";
        this.visibleWord = "";
        this.tries = 0;
        this.alreadyGuessed = [];
        const words = wordsJson as [string, number][];
        const nonSelectors = this.dictionary.getNonSelectorsRegex();
        while (this.word === "") {
            const candidate = pickRandomItem(words);
            let w = textOnlyHelper(candidate[0]);
            w = w.replace(nonSelectors, "").trim();
            if (candidate[1] > 10 && w.length >= 5 && w.length <= 20 && /[a-z]+/i.test(w)) this.word = w;
        }

        this.visibleWord = "―".repeat(this.word.length);
        this.hasEnded = false;
        this.messageHandler.send(message, "Starting new hangman game.");
        this.logger.debug(`Hangman word: ${this.word}`);
        this.sendEmbed(message);
    }

    private guess(message: BotMessage, guessedContent: string | undefined): void {
        if (this.hasEnded) {
            this.messageHandler.send(message, "This hangman game has ended...");

            return;
        }
        if (!guessedContent) {
            this.messageHandler.send(message, "Not a valid guess!");

            return;
        }

        let content: string;
        if (guessedContent.length > 1) {
            if (guessedContent === this.word) {
                content = `You guessed the word ${this.word} after ${this.tries} tries -- You have won!`;
                this.hasEnded = true;
            } else {
                content = `Wrong! The word is not ${guessedContent}`;
                this.tries++;
            }
        } else if (this.alreadyGuessed.includes(guessedContent)) {
            content = `${guessedContent} has already been guessed.`;
        } else if (this.word.includes(guessedContent)) {
            for (let i = 0; i < this.word.length; i++)
                if (this.word[i] === guessedContent)
                    this.visibleWord = replaceAtHelper(this.visibleWord, i, guessedContent);
            content = `Good guess! The word contains ${guessedContent}`;
        } else {
            content = `The word does not contain ${guessedContent}!`;
            this.alreadyGuessed.push(guessedContent);
            this.tries++;
        }
        if (this.tries === this.maxTries) {
            content = `Oh no! You have been hanged! The word was ${this.word}`;
            this.hasEnded = true;
        } else if (this.visibleWord === this.word) {
            content = "You've won by guessing all the letters!";
            this.hasEnded = true;
        }

        this.sendEmbed(message, content);
    }

    private help(message: BotMessage): void {
        if (this.hasEnded) this.start(message);
        else this.sendEmbed(message);
    }

    private sendEmbed(message: BotMessage, content = ""): void {
        const attachment = new AttachmentBuilder(path.join(this.assetsDir, `${this.tries}.png`), {
            name: "hangman.png",
        });
        const showWord = [...this.visibleWord].map((c) => `${c.toUpperCase()} `).join("");
        const embed = new EmbedBuilder()
            .setColor(this.config.color_hex as `#${string}`)
            .setTitle(`Hangman -- ${this.tries}/${this.maxTries} tries`)
            .setDescription(content)
            .setImage("attachment://hangman.png")
            .addFields({ name: "Word", value: showWord, inline: false });
        if (this.alreadyGuessed.length > 0)
            embed.addFields({
                name: "Already guessed letters",
                value: this.alreadyGuessed.map((c) => `${c.toUpperCase()} `).join(""),
                inline: false,
            });
        embed.setFooter({
            text: this.hasEnded ? "Use b!hangman start to start a new game!" : "Use b!hangman guess to guess",
        });
        this.messageHandler.send(message, { files: [attachment], embeds: [embed] });
    }
}
