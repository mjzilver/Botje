import os from "os";
import type { IClCommand, IBotContext } from "../../interfaces";
import { formatUptime, toError } from "../../systems/utils";

const formatter = new Intl.NumberFormat("en-GB");

export default {
    name: "report",
    description: "reports information about bot's process",
    format: "report",
    async function(_input: string[], context: IBotContext) {
        try {
            const { rss, heapUsed, heapTotal } = process.memoryUsage();
            const now = new Date();
            const diff = now.getTime() - (context.client.readyTimestamp ?? 0);
            const formattedUptime = formatUptime(diff);
            const ipAddress =
                Object.values(os.networkInterfaces())
                    .flat()
                    .find((alias) => alias?.family === "IPv4" && !alias?.internal)?.address ?? "Not found";
            const printRows: [string, string | number][] = [
                ["Process ID", process.pid],
                ["IP address", ipAddress],
                ["Node.js Version", process.version],
                ["Memory: rss", `${Math.round((rss / 1024 / 1024) * 100) / 100} MB`],
                ["Memory: heapUsed", `${Math.round((heapUsed / 1024 / 1024) * 100) / 100} MB`],
                ["Memory: heapTotal", `${Math.round((heapTotal / 1024 / 1024) * 100) / 100} MB`],
                ["Uptime", formattedUptime],
            ];
            const sql = `SELECT pg_size_pretty(pg_database_size('botdb')) AS size, COUNT(messages.id) as count FROM messages`;
            const rows = await context.database.query<{ size: string; count: string }>(sql, []);
            if (rows.length === 0) {
                context.logger.error("No data found in the database.");

                return;
            }

            printRows.push(
                ["Database Size", String(rows[0].size)],
                ["Message Count", formatter.format(Number(rows[0].count))],
            );
            printRows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
            context.logger.printRows(printRows as [string, string | number][]);
        } catch (error) {
            context.logger.error(toError(error));
        }
    },
} satisfies IClCommand;
