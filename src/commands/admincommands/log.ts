import type { ICommand } from "../../interfaces";
import { queryLogsAsync } from "../../infrastructure/logger";
import type { LogEntry } from "../../interfaces";
import type { QueryOptions } from "winston";
import { toError } from "../../utils";

const LOG_LEVEL = "error";
const logOptions: QueryOptions = { limit: 5, order: "desc", fields: [] };

export default {
    name: "log",
    description: "shows recent error logs",
    format: "log",
    async function(message, context) {
        let results: { file?: LogEntry[] };
        try {
            results = await queryLogsAsync(logOptions);
        } catch (err) {
            context.logger.warn(`Error in log query: ${toError(err).message}`);

            return;
        }

        let logs: LogEntry[] = results.file ?? [];
        logs = logs.filter((log) => log.level === LOG_LEVEL);
        logs = logs.slice(0, logOptions.limit);
        if (logs.length === 0) {
            await context.messageHandler.send(message, "No logs found in the last 24 hours.");

            return;
        }

        await context.messageHandler.send(
            message,
            `Found ${logs.length} error logs in the last 24 hours. Fetching details...`,
        );
        for (const log of logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())) {
            const timestamp = new Date(log.timestamp).toLocaleString("nl-NL");
            await context.messageHandler.send(message, `Log at ${timestamp} level: ${log.level} ${log.message}`);
        }
    },
} satisfies ICommand;
