import Winston from "winston";
import type { ILogger, LogEntry } from "../interfaces";
const { combine, timestamp, colorize, printf, json } = Winston.format;
const loggerLevels: Winston.config.AbstractConfigSetLevels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    console: 4,
    repeat: 5,
    startup: 6,
};
Winston.addColors({
    console: "grey",
    startup: "magenta",
    repeat: "cyan",
});
let activeTransports: Winston.transport[] = [];
let activeWinstonLogger: Winston.Logger;
function createLogger(consoleLevel = "startup", fileLevel: string | null = "debug", logFile = "bot.log"): ILogger {
    activeTransports = [
        new Winston.transports.Console({
            level: consoleLevel,
            format: combine(
                timestamp({ format: "DD-MM-YYYY HH:mm:ss" }),
                colorize(),
                printf((output) => `${output.timestamp} ${output.level}: ${output.message}`),
            ),
        }),
    ];
    if (fileLevel !== null) {
        activeTransports.push(
            new Winston.transports.File({
                filename: logFile,
                level: fileLevel,
                format: combine(timestamp(), json()),
            }),
        );
    }
    activeWinstonLogger = Winston.createLogger({
        levels: loggerLevels,
        transports: activeTransports,
    });
    const ilogger: ILogger = {
        error: (message: string | Error) => {
            if (message instanceof Error) activeWinstonLogger.error(message.stack ?? message.toString());
            else activeWinstonLogger.error(message);
        },
        warn: (msg: string) => {
            activeWinstonLogger.warn(msg);
        },
        info: (msg: string) => {
            activeWinstonLogger.info(msg);
        },
        debug: (msg: string) => {
            activeWinstonLogger.debug(msg);
        },
        startup: (msg: string) => {
            activeWinstonLogger.log("startup", msg);
        },
        console: (msg: string) => {
            activeWinstonLogger.log("console", msg);
        },
        repeat: (msg: string) => {
            activeWinstonLogger.log("repeat", msg);
        },
        printColumns: (arrays: string[][], headers: string[] = []) => {
            if (!arrays.length) return;
            const rowCount = arrays[0].length;
            const colWidths = arrays.map((col) => Math.max(...col.map((val) => String(val).length)));
            if (headers.length) {
                ilogger.console(headers.map((val, i) => String(val).padEnd(colWidths[i])).join(" | "));
                ilogger.console(colWidths.map((w) => "=".repeat(w)).join(" | "));
            }
            for (let row = 0; row < rowCount; row++) {
                const line = arrays.map((col, i) => String(col[row]).padEnd(colWidths[i])).join(" | ");
                ilogger.console(line);
            }
        },
        printRows: (rows: Array<[string, string | number]>, logFn?: (msg: string) => void) => {
            const fn = logFn ?? ((msg: string) => ilogger.console(msg));
            if (!rows.length) return;
            const colCount = rows[0].length;
            const colWidths = Array.from({ length: colCount }, (_, i) =>
                Math.max(...rows.map((row) => String(row[i]).length)),
            );
            for (const row of rows) {
                fn(row.map((val, i) => String(val).padEnd(colWidths[i])).join(" | "));
            }
        },
    };
    return ilogger;
}
export const logger = createLogger();
export function createSilentLogger(): ILogger {
    return createLogger("error", null);
}
export function setLogLevel(level: string): void {
    if (level in loggerLevels) activeTransports[0].level = level;
}
export function getAvailableLevels(): string[] {
    return Object.keys(loggerLevels);
}
export function getCurrentLogLevel(): string {
    return activeTransports[0]?.level ?? "startup";
}
export function queryLogs(
    options: { limit?: number; order?: string; level?: string },
    callback: (err: Error | null, results: { file?: LogEntry[] }) => void,
): void {
    activeWinstonLogger.query(options as unknown as Winston.QueryOptions, (err, results) => {
        callback(err as Error | null, results as { file?: LogEntry[] });
    });
}
export default logger;
