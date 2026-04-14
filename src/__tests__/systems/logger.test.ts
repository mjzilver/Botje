import { describe, it, expect } from "vitest";
import { createSilentLogger } from "../../systems/logger";

describe("createSilentLogger", () => {
    it("returns a logger with all ILogger methods", () => {
        const logger = createSilentLogger();
        expect(typeof logger.info).toBe("function");
        expect(typeof logger.warn).toBe("function");
        expect(typeof logger.error).toBe("function");
        expect(typeof logger.debug).toBe("function");
        expect(typeof logger.console).toBe("function");
        expect(typeof logger.startup).toBe("function");
        expect(typeof logger.repeat).toBe("function");
        expect(typeof logger.printColumns).toBe("function");
        expect(typeof logger.printRows).toBe("function");
    });
    it("does not throw when logging at any level", () => {
        const logger = createSilentLogger();
        expect(() => logger.info("info msg")).not.toThrow();
        expect(() => logger.warn("warn msg")).not.toThrow();
        expect(() => logger.error(new Error("err"))).not.toThrow();
        expect(() => logger.error("plain string error")).not.toThrow();
        expect(() => logger.debug("debug msg")).not.toThrow();
    });
});
describe("logger.printColumns", () => {
    it("does not throw on empty arrays", () => {
        const logger = createSilentLogger();
        expect(() => logger.printColumns([])).not.toThrow();
    });
    it("does not throw with data and no headers", () => {
        const logger = createSilentLogger();
        expect(() =>
            logger.printColumns([
                ["Alice", "Bob"],
                ["100", "200"],
            ]),
        ).not.toThrow();
    });
    it("does not throw with data and headers", () => {
        const logger = createSilentLogger();
        expect(() =>
            logger.printColumns(
                [
                    ["Alice", "Bob"],
                    ["100", "200"],
                ],
                ["Name", "Score"],
            ),
        ).not.toThrow();
    });
    it("calls custom logFn with formatted columns when headers provided", () => {
        const logger = createSilentLogger();
        const output: string[] = [];
        const original = logger.console.bind(logger);
        logger.console = (msg: string) => {
            output.push(msg);
            original(msg);
        };

        logger.printColumns([["Alice"], ["42"]], ["Name", "Score"]);
        expect(output.length).toBeGreaterThan(0);
        expect(output[0]).toMatch(/Name/);
    });
});
describe("logger.printRows", () => {
    it("does not throw on empty array", () => {
        const logger = createSilentLogger();
        expect(() => logger.printRows([])).not.toThrow();
    });
    it("formats rows with correct padding", () => {
        const logger = createSilentLogger();
        const lines: string[] = [];
        logger.printRows(
            [
                ["Name", "Score"],
                ["Alice", "100"],
                ["Bob", "2000"],
            ],
            (line) => lines.push(line),
        );
        expect(lines).toHaveLength(3);
        expect(lines[0].length).toBe(lines[1].length);
    });
    it("uses custom logFn if provided", () => {
        const logger = createSilentLogger();
        const captured: string[] = [];
        logger.printRows([["a", "b"]], (line) => captured.push(line));
        expect(captured).toHaveLength(1);
    });
    it("uses default console output when no logFn provided", () => {
        const logger = createSilentLogger();
        expect(() => logger.printRows([["a", "b"]])).not.toThrow();
    });
});
describe("logger.error", () => {
    it("handles Error objects without throwing", () => {
        const logger = createSilentLogger();
        expect(() => logger.error(new Error("boom"))).not.toThrow();
    });
    it("handles non-Error messages without throwing", () => {
        const logger = createSilentLogger();
        expect(() => logger.error("plain message")).not.toThrow();
        expect(() => logger.error(42 as unknown as string)).not.toThrow();
        expect(() => logger.error(null as unknown as string)).not.toThrow();
    });
});
