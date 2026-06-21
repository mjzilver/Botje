import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { Settings } from "../../infrastructure/settings";
import type { BotConfig } from "../../interfaces/config";

const MINIMAL_CONFIG: Partial<BotConfig> = {
    prefix: "!",
    timeoutDuration: 30,
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
        tmpFile = writeTempConfig(MINIMAL_CONFIG);
    });
    afterEach(() => {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    });
    it("loads config from the given path", () => {
        const settings = new Settings(noop, tmpFile);
        expect(settings.config.prefix).toBe("!");
        expect(settings.config.timeoutDuration).toBe(30);
    });
    it("returns an empty object when the file does not exist", () => {
        const settings = new Settings(noop, "/nonexistent/path/config.json");
        expect(settings.config).toEqual({});
    });
    it("logs an error when the file does not exist", () => {
        const errors: string[] = [];
        const logger = { error: (msg: string) => errors.push(msg) };
        new Settings(logger, "/nonexistent/path/config.json");
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
