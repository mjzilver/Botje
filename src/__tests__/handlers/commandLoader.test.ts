import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { loadCommands } from "../../handlers/commandLoader";
import { createSilentLogger } from "../../infrastructure/logger";

const logger = createSilentLogger();

function makeTmpDir(): string {
    const dir = path.join("/tmp", `botje-cltest-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(dir, { recursive: true });

    return dir;
}

function writeCommand(dir: string, file: string, obj: object): void {
    const content = `module.exports = ${JSON.stringify(obj)}`;
    fs.writeFileSync(path.join(dir, file), content);
}

function teardown(dir: string): void {
    fs.rmSync(dir, { recursive: true, force: true });
}

describe("loadCommands – non-existent dir", () => {
    it("returns empty collections when base dir does not exist", () => {
        const result = loadCommands("/tmp/does-not-exist-ever", logger);
        expect(Object.keys(result.commands)).toHaveLength(0);
        expect(Object.keys(result.admincommands)).toHaveLength(0);
        expect(Object.keys(result.clcommands)).toHaveLength(0);
        expect(Object.keys(result.dmcommands)).toHaveLength(0);
    });
});
describe("loadCommands – basic loading", () => {
    let baseDir: string;
    beforeEach(() => {
        baseDir = makeTmpDir();
        fs.mkdirSync(path.join(baseDir, "commands"), { recursive: true });
    });
    afterEach(() => teardown(baseDir));
    it("loads a single command", () => {
        writeCommand(path.join(baseDir, "commands"), "ping.js", {
            name: "ping",
            description: "pong",
            format: "ping",
            function: "function() {}",
        });
        const result = loadCommands(baseDir, logger);
        expect(result.commands["ping"]).toBeDefined();
        expect(result.commands["ping"].name).toBe("ping");
    });
    it("skips disabled commands", () => {
        writeCommand(path.join(baseDir, "commands"), "disabled.js", {
            name: "disabled",
            description: "nope",
            format: "disabled",
            disabled: true,
            function: "function() {}",
        });
        const result = loadCommands(baseDir, logger);
        expect(result.commands["disabled"]).toBeUndefined();
    });
    it("registers aliases", () => {
        writeCommand(path.join(baseDir, "commands"), "help.js", {
            name: "help",
            description: "help",
            format: "help",
            aliases: "h, ?",
            function: "function() {}",
        });
        const result = loadCommands(baseDir, logger);
        expect(result.commands["h"]).toBeDefined();
        expect(result.commands["?"]).toBeDefined();
        expect(result.commands["h"]).toBe(result.commands["help"]);
    });
    it("skips non-js/ts files", () => {
        fs.writeFileSync(path.join(baseDir, "commands", "readme.md"), "# readme");
        const result = loadCommands(baseDir, logger);
        expect(Object.keys(result.commands)).toHaveLength(0);
    });
});
describe("loadCommands – admin + cl + dm sub-directories", () => {
    let baseDir: string;
    beforeEach(() => {
        baseDir = makeTmpDir();
        fs.mkdirSync(path.join(baseDir, "commands", "admincommands"), { recursive: true });
        fs.mkdirSync(path.join(baseDir, "commands", "clcommands"), { recursive: true });
        fs.mkdirSync(path.join(baseDir, "commands", "dmcommands"), { recursive: true });
    });
    afterEach(() => teardown(baseDir));
    it("loads admin commands into admincommands map", () => {
        writeCommand(path.join(baseDir, "commands", "admincommands"), "nuke.js", {
            name: "nuke",
            description: "nuke",
            format: "nuke",
            function: "function() {}",
        });
        const result = loadCommands(baseDir, logger);
        expect(result.admincommands["nuke"]).toBeDefined();
        expect(result.commands["nuke"]).toBeUndefined();
    });
    it("loads cl commands into clcommands map", () => {
        writeCommand(path.join(baseDir, "commands", "clcommands"), "save.js", {
            name: "save",
            description: "save",
            format: "save",
            function: "function() {}",
        });
        const result = loadCommands(baseDir, logger);
        expect(result.clcommands["save"]).toBeDefined();
    });
    it("loads dm commands into dmcommands map", () => {
        writeCommand(path.join(baseDir, "commands", "dmcommands"), "help.js", {
            name: "help",
            description: "help",
            format: "help",
            function: "function() {}",
        });
        const result = loadCommands(baseDir, logger);
        expect(result.dmcommands["help"]).toBeDefined();
    });
});
describe("loadCommands – alias edge cases", () => {
    let baseDir: string;
    beforeEach(() => {
        baseDir = makeTmpDir();
        fs.mkdirSync(path.join(baseDir, "commands"), { recursive: true });
    });
    afterEach(() => teardown(baseDir));
    it("handles empty alias segments gracefully", () => {
        writeCommand(path.join(baseDir, "commands"), "cmd.js", {
            name: "cmd",
            description: "cmd",
            format: "cmd",
            aliases: " , ,  ,",
            function: "function() {}",
        });
        const result = loadCommands(baseDir, logger);
        expect(result.commands[""]).toBeUndefined();
        expect(result.commands["cmd"]).toBeDefined();
    });
});
