import type { ICommand } from "../../interfaces";
import { queryLogs } from "../../systems/logger";
import type { LogEntry } from "../../interfaces";
const logOptions = { limit: 5, order: "desc", level: "error" };
export default {
    name: "log",
    description: "shows recent error logs",
    format: "log",
    async function(message, context) {
        queryLogs(logOptions, (err, results) => {
            if (err) {
                context.logger.warn(`Error in log query: ${String(err)}`);
                return;
            }
            let logs: LogEntry[] = results.file ?? [];
            if (logOptions.level) logs = logs.filter((log) => log.level === logOptions.level);
            logs = logs.slice(0, logOptions.limit);
            if (logs.length === 0) {
                context.messageHandler.send(message, "No logs found in the last 24 hours.");
                return;
            }
            context.messageHandler.send(
                message,
                `Found ${logs.length} error logs in the last 24 hours. Fetching details...`,
            );
            logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).forEach((log) => {
                const timestamp = new Date(log.timestamp).toLocaleString("nl-NL");
                context.messageHandler.send(message, `Log at ${timestamp} level: ${log.level} ${log.message}`);
            });
        });
    },
} satisfies ICommand;
