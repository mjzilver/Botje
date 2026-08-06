import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Settings } from "../../infrastructure/settings";
import type { BotConfig } from "../../interfaces/config";

const VALID_CONFIG: BotConfig = {
    prefix: "!",
    botName: "botje",
    discordApiKey: "discord",
    discordApiKeyBeta: "discord-beta",
    weatherApiKey: "weather",
    youtubeApiKey: "youtube",
    owner: "owner-id",
    speakEvery: 20,
    speakMinTimeoutMinutes: 20,
    speakMaxTimeoutMinutes: 60,
    speakRandomChance: 20,
    downvoteThreshold: 3,
    timeoutDuration: 30,
    colorHex: "#bab3be",
    positiveEmoji: "⬆️",
    negativeEmoji: "⬇️",
    redoEmoji: "🔁",
    db: {
        user: "botje",
        host: "localhost",
        database: "botdb",
        password: "pw",
        port: 5432,
        poolSize: 25,
    },
    llm: {
        model: "model",
        api: "http://localhost",
        basePrompt: "base",
        conversationPrompt: "conversation",
        tarotPrompt: "tarot",
        maxConcurrentRequests: 3,
    },
    shouldScanOnStartup: true,
};
const noop = { error: () => {} };

function writeTempConfig(data: object): string {
    const file = path.join(os.tmpdir(), `settings-test-${Date.now()}.json`);
    fs.writeFileSync(file, JSON.stringify(data), "utf8");

    return file;
}

describe("Settings", () => {
    let tmpFile: string;
    beforeEach(() => {
        tmpFile = writeTempConfig(VALID_CONFIG);
    });

    afterEach(() => {
        if (fs.existsSync(tmpFile)) {
            fs.unlinkSync(tmpFile);
        }
    });

    it("loads config from the given path", () => {
        const settings = new Settings(noop, tmpFile);
        expect(settings.config.prefix).toBe("!");
        expect(settings.config.timeoutDuration).toBe(30);
    });

    it("throws when the file does not exist", () => {
        expect(() => new Settings(noop, "/nonexistent/path/config.json")).toThrow("Invalid config file");
    });

    it("throws when a required field is missing", () => {
        const invalidFile = writeTempConfig({ prefix: "!" });

        expect(() => new Settings(noop, invalidFile)).toThrow("Invalid config file");

        if (fs.existsSync(invalidFile)) {
            fs.unlinkSync(invalidFile);
        }
    });

    it("logs an error when the file does not exist", () => {
        const errors: string[] = [];
        const logger = { error: (msg: string) => errors.push(msg) };

        expect(() => new Settings(logger, "/nonexistent/path/config.json")).toThrow("Invalid config file");
        expect(errors.length).toBe(1);
        expect(errors[0]).toContain("Error loading config file");
    });

    describe("updateVariable", () => {
        it("updates the in-memory config value", () => {
            const settings = new Settings(noop, tmpFile);
            settings.updateVariable("prefix", "?");
            expect(settings.config.prefix).toBe("?");
        });

        it("persists the change to the injectable path, not the default", () => {
            const settings = new Settings(noop, tmpFile);
            settings.updateVariable("prefix", "?");
            const saved = JSON.parse(fs.readFileSync(tmpFile, "utf8")) as BotConfig;
            expect(saved.prefix).toBe("?");
        });

        it("does not write to cwd/config.json (the default path)", () => {
            const defaultPath = path.resolve(process.cwd(), "config.json");
            const defaultBefore = fs.existsSync(defaultPath) ? fs.readFileSync(defaultPath, "utf8") : null;
            const settings = new Settings(noop, tmpFile);
            settings.updateVariable("prefix", "?");
            const defaultAfter = fs.existsSync(defaultPath) ? fs.readFileSync(defaultPath, "utf8") : null;
            expect(defaultAfter).toBe(defaultBefore);
        });
    });
});
